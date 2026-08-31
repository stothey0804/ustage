import { NextResponse, after } from "next/server";
import { z } from "@/lib/zod";
import bcrypt from "bcryptjs";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeEventHtml } from "@/lib/sanitize";
import { getAccountEmail } from "@/lib/account-email";
import { sendBookingCancelled, sendOwnerCancelNotice, getBaseUrl } from "@/lib/email";
import { formatKST } from "@/lib/date";
import { selfCancelBlockReason } from "@/lib/booking-cancel";
import { bookingUnitPrice } from "@/lib/booking-price";
import { effectiveQuantity } from "@/lib/seats";

const cancelSchema = z.object({
  booking_id: z.string().uuid(),
  // 비회원 본인 확인 (회원은 세션으로 확인)
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
});

// 후보가 없을 때도 동일한 시간을 소비해 예약 존재 여부가 응답 시간으로 새지 않게 한다.
const DUMMY_HASH =
  "$2b$10$oTQzYOh9/OwmdGkVxQ0CFeN15copdbNHCuOKsxkQNrRUsOjoFwgyG";

const FORBIDDEN = {
  error: "예약을 확인할 수 없습니다. 이메일과 비밀번호를 확인해 주세요.",
};

type EventRow = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  event_end_date: string | null;
  venue: string;
  venue_address: string | null;
  contact: string;
  cancel_policy: string | null;
  performer_id: string;
  price: number;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const { booking_id, password } = parsed.data;
  const email = parsed.data.email?.trim().toLowerCase();

  // 비밀번호 대입 방지: IP당 분당 10회 + 예약당 15분 5회
  const ip = getClientIp(req);
  const [ipAllowed, bookingAllowed] = await Promise.all([
    checkRateLimit(`cancel:ip:${ip}`, 10, 60),
    checkRateLimit(`cancel:booking:${booking_id}`, 5, 900),
  ]);
  if (!ipAllowed || !bookingAllowed) {
    return NextResponse.json(
      { error: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      "id, user_id, name, email, password_hash, quantity, cancelled_quantity, status, unit_price, booking_tickets(checked_in), events!inner(id, title, slug, event_date, event_end_date, venue, venue_address, contact, cancel_policy, performer_id, price)"
    )
    .eq("id", booking_id)
    .single();

  if (error || !booking) {
    // 존재하지 않는 예약도 권한 실패와 같은 응답 — 예약 ID 스캔 방지
    await bcrypt.compare(password ?? "", DUMMY_HASH);
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const event = booking.events as unknown as EventRow;

  // 본인 확인 — 회원은 세션 user_id, 비회원은 이메일 + 비밀번호 bcrypt 대조
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let authorized = !!user && booking.user_id === user.id;

  if (!authorized) {
    const emailMatches =
      !!email && !!booking.email && booking.email.toLowerCase() === email;
    if (emailMatches && password && booking.password_hash) {
      authorized = await bcrypt.compare(password, booking.password_hash);
    } else {
      // 타이밍 사이드채널 완화
      await bcrypt.compare(password ?? "", DUMMY_HASH);
    }
  }

  if (!authorized) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  // 취소 가능 여부는 화면과 같은 함수로 판정한다 (lib/booking-cancel.ts)
  const tickets = (booking.booking_tickets ?? []) as { checked_in: boolean }[];
  // 이 예매에 실제로 적용된 단가로 판정한다 — 현장 예매는 온라인 가격과 다를 수 있고,
  // 스테이지 가격으로 판정하면 현장 결제 확정분이 "무료 예약"으로 새어 나간다.
  const unitPrice = bookingUnitPrice(booking, event.price ?? 0);
  const blockReason = selfCancelBlockReason({
    status: booking.status,
    price: unitPrice,
    checkedIn: tickets.some((t) => t.checked_in),
    eventEnd: new Date(event.event_end_date ?? event.event_date),
  });

  if (blockReason) {
    return NextResponse.json({ error: blockReason }, { status: 409 });
  }

  // 검사한 상태가 그대로일 때만 갱신한다 — 중복 취소는 물론, 검사와 갱신 사이에
  // 주최자가 입금확인(pending→confirmed)을 마친 경우도 여기서 걸러진다.
  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking_id)
    .eq("status", booking.status)
    .select("id");

  if (updateError) {
    console.error("[bookings/cancel]", updateError);
    return NextResponse.json(
      { error: "취소 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      {
        error:
          "예약 상태가 방금 변경되어 취소하지 못했습니다. 화면을 새로고침해 확인해 주세요.",
      },
      { status: 409 }
    );
  }

  const wasConfirmed = booking.status === "confirmed";
  // 부분 취소분을 뺀 유효 매수 — 주최자의 환불 판단이 이 숫자를 따라간다
  const quantity = effectiveQuantity(booking);
  const eventDate = formatKST(event.event_date);
  const baseUrl = getBaseUrl();

  // 참석자 취소 완료 메일 + 주최자 알림 — 응답 후 발송
  after(async () => {
    if (booking.email) {
      await sendBookingCancelled({
        to: booking.email,
        name: booking.name,
        quantity,
        eventTitle: event.title,
        eventDate,
        eventVenue: event.venue_address || event.venue,
        contact: event.contact,
        cancelPolicyHtml: event.cancel_policy
          ? sanitizeEventHtml(event.cancel_policy)
          : undefined,
      }).catch((err) => console.error("[email]", err));
    }

    // 주최자 알림 — 계정 이메일(없으면 온보딩에서 입력한 주소)로 발송
    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(
      event.performer_id
    );
    if (ownerError) {
      console.error("[bookings/cancel] owner lookup", ownerError);
      return;
    }
    const ownerEmail = getAccountEmail(owner?.user ?? null);
    if (!ownerEmail) return;

    await sendOwnerCancelNotice({
      to: ownerEmail,
      attendeeName: booking.name,
      attendeeEmail: booking.email ?? "-",
      quantity,
      eventTitle: event.title,
      eventDate,
      manageUrl: `${baseUrl}/dashboard/events/${event.id}`,
      wasConfirmed,
      isFree: unitPrice === 0,
    }).catch((err) => console.error("[email]", err));
  });

  return NextResponse.json({ success: true });
}
