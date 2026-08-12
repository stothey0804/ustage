import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Banknote } from "lucide-react";
import { formatKST } from "@/lib/date";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";
import { AdditionalPurchase } from "@/components/booking/AdditionalPurchase";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { AddToCalendar } from "@/components/booking/AddToCalendar";
import { RichTextView } from "@/components/RichTextView";
import { sanitizeEventHtml } from "@/lib/sanitize";
import { VenueMapLinks } from "@/components/booking/VenueMapLinks";
import { CopyButton } from "@/components/ui/copy-button";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { formatBookingNoRange } from "@/lib/booking-code";
import { selfCancelBlockReason } from "@/lib/booking-cancel";
import { remainingSeats } from "@/lib/seats";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "*, events(id, title, event_date, event_end_date, venue, venue_address, price, bank_info, slug, poster_url, contact, cancel_policy, capacity)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!booking) notFound();

  // 티켓 조회 (admin — RLS 우회)
  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("booking_tickets")
    .select("*")
    .eq("booking_id", id)
    .order("ticket_number", { ascending: true });

  const event = booking.events as {
    id: string;
    title: string;
    event_date: string;
    event_end_date: string | null;
    venue: string;
    venue_address: string | null;
    price: number;
    bank_info: string;
    slug: string;
    poster_url: string | null;
    contact: string;
    cancel_policy: string | null;
    capacity: number | null;
  } | null;

  const status = booking.status;
  const isFree = event?.price === 0;
  const quantity = booking.quantity ?? 1;
  const cancelPolicyHtml = event?.cancel_policy
    ? sanitizeEventHtml(event.cancel_policy)
    : undefined;

  // 추가 구매 매수 상한에 쓸 잔여석 — 신규 예매 폼과 같은 기준.
  // 남의 예매는 RLS로 읽히지 않으므로 service_role로 합산만 읽는다(공개 페이지와 동일).
  let remaining: number | null = null;
  if (event?.capacity) {
    const { data: seatRows } = await admin
      .from("bookings")
      .select("status, quantity")
      .eq("event_id", event.id);
    remaining = remainingSeats(seatRows ?? [], event.capacity);
  }

  // 참석자 직접 취소 가능 여부 — 서버(API)와 같은 함수로 판정한다.
  const cancelBlockReason = selfCancelBlockReason({
    status,
    price: event?.price ?? 0,
    checkedIn: (tickets ?? []).some((t) => t.checked_in),
    eventEnd: event ? new Date(event.event_end_date ?? event.event_date) : null,
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* 뒤로가기 */}
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 티켓
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-snug">
            {event ? (
              <Link
                href={`/e/${event.slug}`}
                className="hover:underline underline-offset-4"
              >
                {event.title}
              </Link>
            ) : (
              "예약 상세"
            )}
          </h1>
          <div className="flex shrink-0 flex-col items-end gap-1 mt-0.5">
            <div className="flex items-center gap-1.5">
              <BookingStatusBadge status={status} isFree={isFree} />
              {quantity > 1 && (
                <Badge variant="outline">{quantity}매</Badge>
              )}
            </div>
            <span className="font-mono text-[13px] font-medium text-primary">
              {formatBookingNoRange(booking.booking_no, quantity, booking.id)}
            </span>
          </div>
        </div>
      </div>

      {/* 상태 설명 */}
      <div className="rounded-lg border p-4 text-sm">
        {status === "pending" && (
          <div className="space-y-1 text-muted-foreground">
            <p>입금 확인 대기 중입니다. 입금 확인은 아래 연락처로 문의해 주세요.</p>
            {event?.contact && (
              <p className="text-xs">
                문의:{" "}
                <span className="font-medium text-foreground">
                  {event.contact}
                </span>
              </p>
            )}
          </div>
        )}
        {status === "confirmed" && (
          <p className="text-green-700 dark:text-green-400">
            {isFree ? "참가가 확정되었습니다." : "입금이 확인되었습니다."} QR 코드로 입장하세요.
          </p>
        )}
        {status === "cancelled" && (
          <div className="space-y-1 text-muted-foreground">
            <p>취소된 예약입니다.</p>
            {event?.contact && (
              <p className="text-xs">
                환불 등 문의는 주최자에게 연락해 주세요: {event.contact}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 추가 구매 — 같은 스테이지에 별도 예약으로 추가 (좌석이 다 차면 감춘다) */}
      {event && status !== "cancelled" && booking.email && remaining !== 0 && (
        <div className="flex justify-end">
          <AdditionalPurchase
            eventId={event.id}
            price={event.price}
            email={booking.email}
            maxQuantity={remaining ?? 20}
            remainingSeats={remaining}
          />
        </div>
      )}

      {/* 스테이지 정보 */}
      {event && (
        <div className="space-y-3">
          <div className="grid gap-3 text-sm">
            {event.event_date && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground w-20 shrink-0">일시</span>
                  <span>{formatKST(event.event_date)}</span>
                </div>
                <AddToCalendar
                  title={event.title}
                  date={event.event_date}
                  venue={event.venue}
                  venueAddress={event.venue_address ?? undefined}
                />
              </div>
            )}
            {!event.venue_address && (
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground w-20 shrink-0">장소</span>
                <span>{event.venue}</span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Banknote className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground w-20 shrink-0">가격</span>
              <span>
                {event.price === 0
                  ? "무료"
                  : `${(event.price * quantity).toLocaleString()}원 (${event.price.toLocaleString()}원 × ${quantity}매)`}
              </span>
            </div>
          </div>

          {/* 지도 링크 */}
          {event.venue_address && (
            <VenueMapLinks address={event.venue_address} />
          )}
        </div>
      )}

      <Separator />

      {/* 예약자 정보 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">예약 정보</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">예약자명</span>
            <span>{booking.name}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">매수</span>
            <span>{quantity}매</span>
          </div>
          {!isFree && (
            <>
              <div className="flex gap-3">
                <span className="text-muted-foreground w-20 shrink-0">입금자명</span>
                <span>{booking.depositor_name}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted-foreground w-20 shrink-0">입금예상시간</span>
                <span>{booking.deposited_at}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 입금 계좌 */}
      {event && !isFree && (status === "pending" || status === "confirmed") && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">입금 계좌</h2>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <p className="text-sm text-muted-foreground flex-1">
                {event.bank_info}
              </p>
              <CopyButton value={event.bank_info} label="계좌복사" />
            </div>
          </div>
        </>
      )}

      {/* 취소·환불 규정 */}
      {cancelPolicyHtml && status !== "cancelled" && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">취소·환불 규정</h2>
            <RichTextView
              html={cancelPolicyHtml}
              className="rounded-lg border bg-muted/30 px-3.5 py-3 text-muted-foreground"
            />
          </div>
        </>
      )}

      {/* 본인 취소 — 막힌 경우에는 버튼만 감추지 않고 이유와 다음 행동을 알려준다 */}
      {cancelBlockReason === null ? (
        <div className="flex justify-end">
          <CancelBooking
            bookingId={booking.id}
            cancelPolicyHtml={cancelPolicyHtml}
            contact={event?.contact}
          />
        </div>
      ) : (
        status !== "cancelled" && (
          <p className="rounded-lg border bg-muted/30 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            {cancelBlockReason}
            {event?.contact ? ` (연락처: ${event.contact})` : ""}
          </p>
        )
      )}

      {/* QR 코드 (confirmed 상태 + 티켓 존재) */}
      {status === "confirmed" && tickets && tickets.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">입장 QR 코드</h2>
            <QRTicket
              name={booking.name}
              tickets={tickets.map((t) => ({
                qr_token: t.qr_token,
                ticket_number: t.ticket_number,
                checked_in: t.checked_in,
                attendee_no: t.attendee_no,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
