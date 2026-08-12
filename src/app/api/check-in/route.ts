import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertEventAccess } from "@/lib/event-access";
import { createAdminClient } from "@/lib/supabase/admin";

const checkInSchema = z.object({
  qr_token: z.string().uuid("유효하지 않은 QR 토큰입니다."),
  event_id: z.string().uuid("유효하지 않은 스테이지 ID입니다."),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 }
    );
  }

  const { qr_token, event_id } = parsed.data;

  // 인증 확인 — 스테이지 소유자 또는 스태프만 입장확인 가능
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const access = await assertEventAccess(event_id, "check_in");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  // QR 토큰으로 티켓 조회 (service_role)
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("booking_tickets")
    .select("id, ticket_number, checked_in, checked_in_at, booking_id, attendee_no, cancelled_at")
    .eq("qr_token", qr_token)
    .single();

  if (!ticket) {
    return NextResponse.json(
      { result: "invalid", message: "유효하지 않은 QR 코드입니다." },
      { status: 200 }
    );
  }

  // 예약 정보 조회 + 스테이지 일치 확인
  const { data: booking } = await admin
    .from("bookings")
    .select("id, name, status, event_id, quantity")
    .eq("id", ticket.booking_id)
    .single();

  if (!booking || booking.event_id !== event_id) {
    return NextResponse.json(
      { result: "invalid", message: "이 스테이지의 QR 코드가 아닙니다." },
      { status: 200 }
    );
  }

  // 현장에서 부르는 번호(인원 번호)를 앞에 붙인다 — 추첨·호명 기준과 같은 번호
  const attendeeNo = ticket.attendee_no ?? ticket.ticket_number;
  const ticketLabel =
    booking.quantity > 1
      ? `#${attendeeNo} ${booking.name} (${ticket.ticket_number}/${booking.quantity})`
      : `#${attendeeNo} ${booking.name}`;

  // 부분 취소된 티켓 — 예매는 살아 있어도 이 티켓만 무효다
  if (ticket.cancelled_at) {
    return NextResponse.json(
      {
        result: "cancelled",
        name: ticketLabel,
        message: "취소된 티켓입니다.",
      },
      { status: 200 }
    );
  }

  // 취소된 예매
  if (booking.status === "cancelled") {
    return NextResponse.json(
      { result: "cancelled", name: ticketLabel, message: "취소된 예매입니다." },
      { status: 200 }
    );
  }

  // 입금대기 상태
  if (booking.status === "pending") {
    return NextResponse.json(
      {
        result: "pending",
        name: ticketLabel,
        message: "입금 확인이 되지 않은 예매입니다.",
      },
      { status: 200 }
    );
  }

  // 이미 입장됨
  if (ticket.checked_in) {
    return NextResponse.json(
      {
        result: "already_checked_in",
        name: ticketLabel,
        checked_in_at: ticket.checked_in_at,
        message: "이미 입장 처리된 티켓입니다.",
      },
      { status: 200 }
    );
  }

  // 입장 성공 — checked_in=false 조건부 갱신으로 동시 스캔 시 한 기기만 성공
  const { data: updated, error: updateError } = await admin
    .from("booking_tickets")
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: user.id,
    })
    .eq("id", ticket.id)
    .eq("checked_in", false)
    .is("cancelled_at", null)
    .select("id");

  if (updateError) {
    console.error("[check-in]", updateError);
    return NextResponse.json(
      { error: "입장 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    // 조회와 갱신 사이에 다른 기기가 먼저 입장 처리한 경우
    return NextResponse.json(
      {
        result: "already_checked_in",
        name: ticketLabel,
        checked_in_at: ticket.checked_in_at,
        message: "이미 입장 처리된 티켓입니다.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { result: "success", name: ticketLabel, message: "입장이 확인되었습니다." },
    { status: 200 }
  );
}
