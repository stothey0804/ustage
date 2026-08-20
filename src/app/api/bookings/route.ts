import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingApiSchema } from "@/lib/validations/booking";
import { sendBookingConfirmation, getBaseUrl } from "@/lib/email";
import { formatKST } from "@/lib/date";
import { autoTransitionStatus } from "@/lib/auto-status";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAccountEmail } from "@/lib/account-email";
import { formatBookingNoRange } from "@/lib/booking-code";
import { occupiedSeats } from "@/lib/seats";
import { resolveBookingIdentity } from "@/lib/booking-inherit";
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

type CreateResult =
  | { bookingId: string }
  /** remaining: 정원 초과일 때 남은 좌석 수 — 폼이 매수 상한을 낮추는 데 쓴다 */
  | { status: number; error: string; code?: string; remaining?: number };

const DUPLICATE_EMAIL_ERROR = "이미 동일한 이메일로 예매된 내역이 있습니다.";

// 추가구매 비밀번호 대조 시 후보가 없어도 동일한 시간을 소비하기 위한 더미 해시
// (예약 존재 여부가 응답 시간으로 새지 않도록).
const DUMMY_HASH =
  "$2b$10$oTQzYOh9/OwmdGkVxQ0CFeN15copdbNHCuOKsxkQNrRUsOjoFwgyG";

/**
 * 정원 초과 응답. 남은 좌석 수를 함께 돌려줘 **폼이 모달을 닫지 않고** 매수를
 * 그 자리에서 줄일 수 있게 한다(동시 제출로 좌석이 줄어드는 일이 잦다).
 */
function capacityExceeded(remaining: number): {
  status: number;
  error: string;
  code: string;
  remaining: number;
} {
  const safe = Math.max(remaining, 0);
  return {
    status: 409,
    error:
      safe <= 0
        ? "좌석이 모두 찼습니다."
        : `잔여 좌석이 ${safe}석입니다. 매수를 조정해 주세요.`,
    code: "capacity_exceeded",
    remaining: safe,
  };
}

/**
 * 정원 검사 + 예매 + 티켓 생성을 DB 트랜잭션(create_booking RPC)으로 원자 처리.
 * 스테이지 행 잠금으로 동시 제출을 직렬화해 정원 초과를 막고,
 * 동일 이메일 중복도 함수 내부에서 검사한다 (allowDuplicate=추가 구매만 예외).
 * 마이그레이션 미적용 환경에서는 기존 비원자 경로로 폴백한다.
 */
async function createBookingAtomic(
  admin: AdminClient,
  capacity: number | null,
  row: NewBooking,
  allowDuplicate: boolean
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
    p_allow_duplicate: allowDuplicate,
  });

  if (!error) return { bookingId: data as string };

  const message = error.message ?? "";

  if (error.code === "23505" || message.includes("DUPLICATE_EMAIL")) {
    return {
      status: 409,
      error: DUPLICATE_EMAIL_ERROR,
      code: "duplicate_email",
    };
  }

  const capacityMatch = message.match(/CAPACITY_EXCEEDED:(\d+)/);
  if (capacityMatch) {
    return capacityExceeded(Number(capacityMatch[1]));
  }

  if (message.includes("EVENT_NOT_OPEN")) {
    return { status: 409, error: "현재 예매를 받지 않는 스테이지입니다." };
  }
  if (message.includes("EVENT_NOT_FOUND")) {
    return { status: 404, error: "스테이지를 찾을 수 없습니다." };
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
      .select("status, quantity, cancelled_quantity")
      .eq("event_id", row.event_id);

    const totalBooked = occupiedSeats(sumResult ?? []);

    if (totalBooked + row.quantity > capacity) {
      return capacityExceeded(capacity - totalBooked);
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

  // 신규 예매는 이름 필수 (추가 구매는 기존 예약에서 상속)
  if (!data.additional && !data.name.trim()) {
    return NextResponse.json(
      { error: "이름을 입력해 주세요." },
      { status: 400 }
    );
  }

  // 비회원 신규 예매는 비밀번호 필수 (조회 시 사용 — 서버에서도 최소 길이 강제)
  if (!user && !data.additional && (!data.password || data.password.length < 4)) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상이어야 합니다." },
      { status: 400 }
    );
  }
  // 비회원 추가 구매는 기존 예약 비밀번호로 본인 확인
  if (!user && data.additional && !data.password) {
    return NextResponse.json(
      { error: "비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  // 로그인 사용자는 세션 이메일을 강제 사용 (임의 이메일 지정 차단).
  // 카카오 계정은 계정 이메일이 비어 있을 수 있어 온보딩에서 받은 주소를 쓴다.
  const sessionEmail = getAccountEmail(user);
  const email = (sessionEmail ?? data.email).trim().toLowerCase();

  // 스테이지 조회
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, slug, status, capacity, booking_start, booking_end, bank_info, price, event_date, event_end_date, venue, venue_address, custom_fields")
    .eq("id", data.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: "스테이지를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 예매 가능 조건 1: 상태 확인
  // 저장된 status가 갱신되지 않았어도(자동 전환은 lazy) 파생 상태로 판정하고,
  // draft→open 등 전환을 DB에 반영한다 — RPC가 저장된 status를 검사하므로 필수.
  const effectiveStatus = (await autoTransitionStatus(event)) ?? event.status;
  if (effectiveStatus !== "open") {
    return NextResponse.json(
      {
        error:
          effectiveStatus === "ended"
            ? "이미 종료된 스테이지입니다."
            : "현재 예매를 받지 않는 스테이지입니다.",
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

  // 유료 스테이지 필수값 서버 검증 (클라이언트 검증 우회 대비)
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
  /**
   * 답변이 함께 왔는지 — 추가 구매의 상속 여부를 가른다.
   * 예매 폼에서 온 추가 구매는 사용자가 필드를 채워 보내므로 **그 값을 쓴다**.
   * 예약 조회 화면의 '추가 구매'는 필드 UI가 없어 답변을 보내지 않으므로 기존 값을 상속한다.
   */
  const hasSubmittedAnswers = Object.keys(customAnswers).length > 0;

  // 답변을 보낸 경우에만 필수 검사 — 상속 경로는 원본이 이미 검사를 통과했다
  if (!data.additional || hasSubmittedAnswers) {
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
  }

  const admin = createAdminClient();

  // 추가 구매: 이 스테이지에 대한 기존 예약의 본인임을 확인하고 정보를 상속
  // (회원 = 세션 user_id 일치, 비회원 = 이메일 + 비밀번호 bcrypt 대조)
  let original: {
    name: string;
    password_hash: string;
    custom_answers: NewBooking["custom_answers"];
  } | null = null;

  if (data.additional) {
    // 1) 회원: 세션 user_id의 기존 예약 (비밀번호 불필요)
    if (user) {
      const { data: mine } = await admin
        .from("bookings")
        .select("name, password_hash, custom_answers")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1);
      if (mine?.[0]) {
        original = {
          name: mine[0].name,
          // 회원 예매는 비밀번호 해시가 빈 문자열이다(컬럼은 nullable)
          password_hash: mine[0].password_hash ?? "",
          custom_answers:
            (mine[0].custom_answers as NewBooking["custom_answers"]) ?? null,
        };
      }
    }

    // 2) 비밀번호 본인 확인 — 비회원, 그리고 "비회원으로 예매한 뒤 로그인한 회원"
    //    (회원 매칭이 실패했고 비밀번호가 제공된 경우)도 여기서 처리한다.
    if (!original && data.password) {
      // 계정 단위 rate limit — 추가구매 경로를 통한 비밀번호 대입 차단
      const acctOk = await checkRateLimit(
        `booking:additional:${event.id}:${email}`,
        5,
        15 * 60
      );
      if (!acctOk) {
        return NextResponse.json(
          { error: "본인 확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
          { status: 429 }
        );
      }

      const emailPattern = email.replace(/([\\%_])/g, "\\$1");
      const { data: candidates } = await admin
        .from("bookings")
        .select("name, password_hash, custom_answers")
        .eq("event_id", event.id)
        .ilike("email", emailPattern)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      for (const candidate of candidates ?? []) {
        if (
          candidate.password_hash &&
          (await bcrypt.compare(data.password, candidate.password_hash))
        ) {
          original = {
            name: candidate.name,
            password_hash: candidate.password_hash,
            custom_answers:
              (candidate.custom_answers as NewBooking["custom_answers"]) ??
              null,
          };
          break;
        }
      }

      // 타이밍 사이드채널 완화: 후보 없음/불일치도 동일한 시간 소비
      if (!original) {
        await bcrypt.compare(data.password, DUMMY_HASH);
      }
    }

    if (!original) {
      return NextResponse.json(
        {
          error:
            "기존 예약을 확인할 수 없습니다. 예약 조회에서 본인 확인 후 다시 시도해 주세요.",
        },
        { status: 403 }
      );
    }
  } else {
    // 신규 예매: 동일 이메일 중복 사전 체크 (친절한 안내용 —
    // 동시 제출 레이스는 create_booking RPC 내부 검사가 최종 차단)
    const { data: existingEmail } = await admin
      .from("bookings")
      .select("id")
      .eq("event_id", event.id)
      .eq("email", email)
      .neq("status", "cancelled")
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json(
        { error: DUPLICATE_EMAIL_ERROR, code: "duplicate_email" },
        { status: 409 }
      );
    }
  }

  // 비밀번호 해시 — 비회원 신규는 새로 해시, 비회원 추가 구매는 기존 해시 상속
  // (같은 비밀번호로 모든 예약이 함께 조회되도록)
  const password_hash = user
    ? ""
    : (original?.password_hash ?? (await bcrypt.hash(data.password!, 10)));

  // 이름·답변을 이번 입력값으로 쓸지 상속할지 — 규칙은 lib/booking-inherit.ts
  const identity = resolveBookingIdentity({
    submittedName: data.name,
    submittedAnswers: customAnswers,
    original,
  });
  const bookerName = identity.name;

  // 정원 검사 + 예매 + 티켓 생성 (원자적 — service_role로 RLS 우회)
  const created = await createBookingAtomic(
    admin,
    event.capacity,
    {
      event_id: event.id,
      user_id: user?.id ?? null,
      name: bookerName,
      email,
      password_hash,
      depositor_name: event.price === 0 ? bookerName : data.depositor_name,
      deposited_at: event.price === 0 ? "무료입장" : data.deposited_at,
      quantity: data.quantity,
      custom_answers: identity.customAnswers as NewBooking["custom_answers"],
      status: event.price === 0 ? "confirmed" : "pending",
    },
    data.additional
  );

  if ("error" in created) {
    return NextResponse.json(
      { error: created.error, code: created.code, remaining: created.remaining },
      { status: created.status }
    );
  }

  const bookingId = created.bookingId;

  // 예매번호(스테이지별 순번)는 DB 트리거가 채우므로 생성 후 읽어 온다.
  // 마이그레이션 미적용 환경에서는 컬럼이 없어 null → 화면은 uuid 파생 코드로 폴백한다.
  let bookingNo: number | null = null;
  {
    const { data: noRow } = await admin
      .from("bookings")
      .select("booking_no")
      .eq("id", bookingId)
      .single();
    bookingNo = noRow?.booking_no ?? null;
  }

  // 무료 스테이지는 즉시 확정 — 신청완료 메일에 입장 QR을 포함
  let emailTickets: { ticket_number: number; qr_token: string }[] | undefined;
  if (event.price === 0) {
    const { data: tickets } = await admin
      .from("booking_tickets")
      .select("ticket_number, qr_token, attendee_no")
      .eq("booking_id", bookingId)
      .order("ticket_number", { ascending: true });
    emailTickets = tickets ?? undefined;
  }

  const baseUrl = getBaseUrl();
  const confirmUrl = user
    ? `${baseUrl}/dashboard/bookings/${bookingId}`
    : `${baseUrl}/e/${event.slug}/me`;

  // after(): 응답 반환 후 실행 보장 — 서버리스에서 fire-and-forget 유실 방지
  after(() =>
    sendBookingConfirmation({
      to: email,
      name: bookerName,
      quantity: data.quantity,
      eventTitle: event.title,
      eventDate: formatKST(event.event_date),
      eventVenue: event.venue_address || event.venue,
      isFree: event.price === 0,
      bankInfo: event.bank_info,
      totalAmount: event.price * data.quantity,
      confirmUrl,
      tickets: emailTickets,
      bookingNoLabel: formatBookingNoRange(bookingNo, data.quantity, bookingId),
    }).catch((err) => console.error("[email]", err))
  );

  return NextResponse.json({ bookingId, bookingNo }, { status: 201 });
}
