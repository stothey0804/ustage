import { NextResponse } from "next/server";
import { z } from "@/lib/zod";
import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeEventHtml } from "@/lib/sanitize";
import { remainingSeats } from "@/lib/seats";

const lookupSchema = z.object({
  event_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
});

// 매칭되는 예약이 없을 때도 bcrypt 비교 1회를 수행해
// 응답 시간으로 이메일 존재 여부를 판별하는 것을 어렵게 한다.
const DUMMY_HASH =
  "$2b$10$oTQzYOh9/OwmdGkVxQ0CFeN15copdbNHCuOKsxkQNrRUsOjoFwgyG";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const { event_id, password } = parsed.data;
  // 기존 데이터에 대소문자가 혼재할 수 있어 ilike로 매칭 (와일드카드 이스케이프)
  const email = parsed.data.email.trim().toLowerCase();
  const emailPattern = email.replace(/([\\%_])/g, "\\$1");

  // 브루트포스 방지: IP당 분당 10회 + 계정(스테이지+이메일)당 15분에 5회
  const ip = getClientIp(req);
  const [ipAllowed, accountAllowed] = await Promise.all([
    checkRateLimit(`lookup:ip:${ip}`, 10, 60),
    checkRateLimit(`lookup:acct:${event_id}:${email}`, 5, 900),
  ]);
  if (!ipAllowed || !accountAllowed) {
    return NextResponse.json(
      { error: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const adminSupabase = createAdminClient();

  const { data: bookings, error } = await adminSupabase
    .from("bookings")
    .select(
      "*, events!inner(id, title, event_date, event_end_date, venue, bank_info, slug, contact, price, cancel_policy, capacity)"
    )
    .eq("event_id", event_id)
    .ilike("email", emailPattern)
    .is("user_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // 유효(미취소) 예약을 먼저, 각 그룹 내에서는 최신순으로
  const candidates = [...(bookings ?? [])].sort(
    (a, b) =>
      Number(a.status === "cancelled") - Number(b.status === "cancelled")
  );

  if (candidates.length === 0) {
    await bcrypt.compare(password, DUMMY_HASH);
    return NextResponse.json(
      { error: "예약 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 추가 구매로 같은 이메일에 예약이 여러 건일 수 있으므로 비밀번호가
  // 일치하는 예약을 전부 반환한다 (추가 구매는 기존 해시를 상속해 함께 매칭됨)
  const matched: typeof candidates = [];
  const verifiedHashes = new Set<string>();
  for (const booking of candidates) {
    const hash = booking.password_hash;
    if (!hash) continue;
    if (verifiedHashes.has(hash) || (await bcrypt.compare(password, hash))) {
      verifiedHashes.add(hash);
      matched.push(booking);
    }
  }

  if (matched.length === 0) {
    return NextResponse.json(
      { error: "예약 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 추가 구매 매수 상한에 쓸 잔여석 — 신규 예매 폼과 같은 기준(취소 제외 quantity 합산).
  // 공개 스테이지 페이지에도 표시되는 정보라 내려보내도 새로 노출되는 것이 없다.
  const eventCapacity = matched[0].events.capacity;
  let remaining: number | null = null;
  if (eventCapacity) {
    const { data: seatRows } = await adminSupabase
      .from("bookings")
      .select("status, quantity, cancelled_quantity")
      .eq("event_id", event_id);
    remaining = remainingSeats(seatRows ?? [], eventCapacity);
  }

  const safeBookings = await Promise.all(
    matched.map(async (booking) => {
      const { data: tickets } = await adminSupabase
        .from("booking_tickets")
        .select("qr_token, ticket_number, checked_in, attendee_no, cancelled_at")
        .eq("booking_id", booking.id)
        .order("ticket_number", { ascending: true });

      const { password_hash, ...safeBooking } = booking;
      void password_hash;
      // 취소 규정은 CKEditor HTML — 클라이언트에서 그대로 렌더하므로 여기서 정화한다.
      const { cancel_policy, ...event } = booking.events;
      // bank_info는 소유자가 입력한 그대로 노출한다. 마스킹이 필요하면 소유자가 직접 입력.
      return {
        ...safeBooking,
        events: {
          ...event,
          cancel_policy_html: cancel_policy
            ? sanitizeEventHtml(cancel_policy)
            : null,
          remaining_seats: remaining,
        },
        tickets: tickets ?? [],
      };
    })
  );

  return NextResponse.json({ bookings: safeBookings });
}
