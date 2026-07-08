import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingApiSchema } from "@/lib/validations/booking";
import { sendBookingConfirmation } from "@/lib/email";
import { formatKST } from "@/lib/date";
import { deriveAutoStatus } from "@/lib/auto-status";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { maskBankInfo } from "@/lib/utils";
import type { CustomField } from "@/lib/validations/event";

type AdminClient = ReturnType<typeof createAdminClient>;

type NewBooking = {
  event_id: string;
  user_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  depositor_name: string;
  deposited_at: string;
  quantity: number;
  custom_answers: Record<string, string | number | boolean> | null;
  status: "pending" | "confirmed";
};

type CreateResult = { bookingId: string } | { status: number; error: string };

const DUPLICATE_EMAIL_ERROR = "이미 동일한 이메일로 예매된 내역이 있습니다.";

function capacityError(remaining: number): string {
  return remaining <= 0
    ? "좌석이 모두 찼습니다."
    : `잔여 좌석이 ${remaining}석입니다. 수량을 조정해 주세요.`;
}

/**
 * 정원 검사 + 예매 + 티켓 생성을 DB 트랜잭션(create_booking RPC)으로 원자 처리.
 * 이벤트 행 잠금으로 동시 제출을 직렬화해 정원 초과를 막고,
 * (event_id, email) 부분 유니크 인덱스가 중복 예매의 최종 방어선.
 * 마이그레이션 미적용 환경에서는 기존 비원자 경로로 폴백한다.
 */
async function createBookingAtomic(
  admin: AdminClient,
  capacity: number | null,
  row: NewBooking
): Promise<CreateResult> {
  // database.ts 재생성 전까지 RPC 타입 부재 — 이 지점에서만 우회 캐스팅
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;

  const { data, error } = await rpc("create_booking", {
    p_event_id: row.event_id,
    p_user_id: row.user_id,
    p_name: row.name,
    p_email: row.email,
    p_password_hash: row.password_hash,
    p_depositor_name: row.depositor_name,
    p_deposited_at: row.deposited_at,
    p_quantity: row.quantity,
    p_custom_answers: row.custom_answers,
    p_status: row.status,
  });

  if (!error) return { bookingId: data as string };

  const message = error.message ?? "";

  if (error.code === "23505") {
    return { status: 409, error: DUPLICATE_EMAIL_ERROR };
  }

  const capacityMatch = message.match(/CAPACITY_EXCEEDED:(\d+)/);
  if (capacityMatch) {
    return { status: 409, error: capacityError(Number(capacityMatch[1])) };
  }

  if (message.includes("EVENT_NOT_OPEN")) {
    return { status: 409, error: "현재 예매를 받지 않는 이벤트입니다." };
  }
  if (message.includes("EVENT_NOT_FOUND")) {
    return { status: 404, error: "이벤트를 찾을 수 없습니다." };
  }
  if (message.includes("INVALID_QUANTITY")) {
    return { status: 400, error: "최대 20매까지 예매할 수 있습니다." };
  }

  // 함수 미존재 = 마이그레이션 미적용 — 비원자 경로로 폴백
  if (error.code === "PGRST202" || message.includes("create_booking")) {
    console.warn(
      "[bookings POST] create_booking RPC가 없어 비원자 경로로 처리합니다. " +
        "supabase/migrations/20260707120000_booking_race_guards.sql을 적용하세요."
    );
    return legacyCreateBooking(admin, capacity, row);
  }

  console.error("[bookings POST] create_booking RPC", error);
  return { status: 500, error: "예매 처리 중 오류가 발생했습니다." };
}

/** 마이그레이션 이전의 read-then-insert 경로. 동시 제출 시 정원 초과 가능. */
async function legacyCreateBooking(
  admin: AdminClient,
  capacity: number | null,
  row: NewBooking
): Promise<CreateResult> {
  if (capacity) {
    const { data: sumResult } = await admin
      .from("bookings")
      .select("quantity")
      .eq("event_id", row.event_id)
      .neq("status", "cancelled");

    const totalBooked = (sumResult ?? []).reduce(
      (sum, b) => sum + (b.quantity ?? 1),
      0
    );

    if (totalBooked + row.quantity > capacity) {
      return { status: 409, error: capacityError(capacity - totalBooked) };
    }
  }

  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert(row)
    .select("id")
    .single();

  if (insertError || !booking) {
    if (insertError?.code === "23505") {
      return { status: 409, error: DUPLICATE_EMAIL_ERROR };
    }
    console.error("[bookings POST]", insertError);
    return { status: 500, error: "예매 처리 중 오류가 발생했습니다." };
  }

  const tickets = Array.from({ length: row.quantity }, (_, i) => ({
    booking_id: booking.id,
    ticket_number: i + 1,
  }));

  const { error: ticketError } = await admin
    .from("booking_tickets")
    .insert(tickets);

  if (ticketError) {
    console.error("[bookings POST] ticket creation error", ticketError);
    // 예매는 생성됐지만 티켓 생성 실패 — 삭제 후 에러
    await admin.from("bookings").delete().eq("id", booking.id);
    return { status: 500, error: "티켓 생성 중 오류가 발생했습니다." };
  }

  return { bookingId: booking.id };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bookingApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 스팸 예매(정원 소진 공격) 완화: IP당 분당 5회
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`booking:ip:${ip}`, 5, 60))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const supabase = await createClient();

  // 현재 로그인 사용자 확인 (없으면 null)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비회원은 비밀번호 필수 (조회 시 사용 — 서버에서도 최소 길이 강제)
  if (!user && (!data.password || data.password.length < 4)) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  // 로그인 사용자는 세션 이메일을 강제 사용 (임의 이메일 지정 차단)
  const email = (user?.email ?? data.email).trim().toLowerCase();

  // 이벤트 조회
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, slug, status, capacity, booking_start, booking_end, bank_info, price, event_date, venue, venue_address, custom_fields")
    .eq("id", data.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: "이벤트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 예매 가능 조건 1: 상태 확인
  // 저장된 status가 갱신되지 않았어도(자동 전환은 lazy) 시각 기준 파생 상태로 판정
  const effectiveStatus = deriveAutoStatus(event) ?? event.status;
  if (effectiveStatus !== "open") {
    return NextResponse.json(
      {
        error:
          effectiveStatus === "ended"
            ? "이미 종료된 행사입니다."
            : "현재 예매를 받지 않는 이벤트입니다.",
      },
      { status: 409 }
    );
  }

  // 예매 가능 조건 2: 예매 기간 확인
  const now = new Date();
  if (event.booking_start && new Date(event.booking_start) > now) {
    return NextResponse.json(
      { error: "아직 예매 기간이 시작되지 않았습니다." },
      { status: 409 }
    );
  }
  if (event.booking_end && new Date(event.booking_end) < now) {
    return NextResponse.json(
      { error: "예매 기간이 종료되었습니다." },
      { status: 409 }
    );
  }

  // 유료 이벤트 필수값 서버 검증 (클라이언트 검증 우회 대비)
  if (
    event.price > 0 &&
    (!data.depositor_name.trim() || !data.deposited_at.trim())
  ) {
    return NextResponse.json(
      { error: "입금자명과 입금 시간을 입력해 주세요." },
      { status: 400 }
    );
  }

  // 커스텀 필드 서버 검증: 정의되지 않은 필드 제거 + required 확인
  const customFields = (event.custom_fields ?? []) as CustomField[];
  const knownFieldIds = new Set(customFields.map((f) => f.id));
  const customAnswers = Object.fromEntries(
    Object.entries(data.custom_answers ?? {}).filter(([key]) =>
      knownFieldIds.has(key)
    )
  );
  for (const field of customFields) {
    if (!field.required) continue;
    const value = customAnswers[field.id];
    const missing =
      field.type === "checkbox"
        ? String(value) !== "true" && value !== true
        : value === undefined || String(value).trim() === "";
    if (missing) {
      return NextResponse.json(
        { error: `'${field.label}' 항목을 입력해 주세요.` },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  // 동일 이메일 중복 예매 사전 체크 (친절한 메시지용 —
  // 동시 제출은 DB 유니크 인덱스가 23505로 최종 차단)
  const { data: existingEmail } = await admin
    .from("bookings")
    .select("id")
    .eq("event_id", event.id)
    .eq("email", email)
    .neq("status", "cancelled")
    .limit(1);

  if (existingEmail && existingEmail.length > 0) {
    return NextResponse.json(
      { error: DUPLICATE_EMAIL_ERROR },
      { status: 409 }
    );
  }

  // 비밀번호 해시 (비회원만)
  const password_hash = user ? "" : await bcrypt.hash(data.password!, 10);

  // 정원 검사 + 예매 + 티켓 생성 (원자적 — service_role로 RLS 우회)
  const created = await createBookingAtomic(admin, event.capacity, {
    event_id: event.id,
    user_id: user?.id ?? null,
    name: data.name,
    email,
    password_hash,
    depositor_name: event.price === 0 ? data.name : data.depositor_name,
    deposited_at: event.price === 0 ? "무료입장" : data.deposited_at,
    quantity: data.quantity,
    custom_answers:
      Object.keys(customAnswers).length > 0 ? customAnswers : null,
    status: event.price === 0 ? "confirmed" : "pending",
  });

  if ("error" in created) {
    return NextResponse.json(
      { error: created.error },
      { status: created.status }
    );
  }

  const bookingId = created.bookingId;

  // 예매 확인 이메일 발송 (비동기 — 실패해도 예매는 성공)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const confirmUrl = user
    ? `${baseUrl}/dashboard/bookings/${bookingId}`
    : `${baseUrl}/e/${event.slug}/me`;

  // after(): 응답 반환 후 실행 보장 — 서버리스에서 fire-and-forget 유실 방지
  after(() =>
    sendBookingConfirmation({
      to: email,
      name: data.name,
      quantity: data.quantity,
      eventTitle: event.title,
      eventDate: formatKST(event.event_date),
      eventVenue: event.venue_address || event.venue,
      isFree: event.price === 0,
      bankInfo: maskBankInfo(event.bank_info),
      totalAmount: event.price * data.quantity,
      confirmUrl,
    }).catch((err) => console.error("[email]", err))
  );

  return NextResponse.json({ bookingId }, { status: 201 });
}
