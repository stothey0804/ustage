import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, Calendar, MapPin, CreditCard } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";

const BOOKING_STATUS_MAP = {
  pending: { label: "입금대기", variant: "secondary" },
  confirmed: { label: "입금완료", variant: "default" },
  cancelled: { label: "취소", variant: "outline" },
} as const;

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko });
  } catch {
    return dateStr;
  }
}

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
      "*, events(id, title, event_date, venue, price, bank_info, slug, poster_url)"
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
    venue: string;
    price: number;
    bank_info: string;
    slug: string;
    poster_url: string | null;
  } | null;

  const status = booking.status as keyof typeof BOOKING_STATUS_MAP;
  const statusInfo = BOOKING_STATUS_MAP[status] ?? BOOKING_STATUS_MAP.pending;
  const quantity = booking.quantity ?? 1;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* 뒤로가기 */}
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 예약
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-snug">
            {event?.title ?? "예약 상세"}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <Badge
              variant={statusInfo.variant as "secondary" | "default" | "outline"}
            >
              {statusInfo.label}
            </Badge>
            {quantity > 1 && (
              <Badge variant="outline">{quantity}매</Badge>
            )}
          </div>
        </div>
      </div>

      {/* 상태 설명 */}
      <div className="rounded-lg border p-4 text-sm">
        {status === "pending" && (
          <p className="text-muted-foreground">
            입금 확인 대기 중입니다. 입금 후 아래 계좌로 확인 요청해 주세요.
          </p>
        )}
        {status === "confirmed" && (
          <p className="text-green-700 dark:text-green-400">
            입금이 확인되었습니다. QR 코드로 입장하세요.
          </p>
        )}
        {status === "cancelled" && (
          <p className="text-muted-foreground">취소된 예약입니다.</p>
        )}
      </div>

      {/* 이벤트 정보 */}
      {event && (
        <div className="grid gap-3 text-sm">
          {event.event_date && (
            <div className="flex items-start gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground w-20 shrink-0">일시</span>
              <span>{formatDate(event.event_date)}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground w-20 shrink-0">장소</span>
            <span>{event.venue}</span>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground w-20 shrink-0">가격</span>
            <span>
              {event.price === 0
                ? "무료"
                : `${(event.price * quantity).toLocaleString()}원 (${event.price.toLocaleString()}원 × ${quantity}매)`}
            </span>
          </div>
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
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">입금자명</span>
            <span>{booking.depositor_name}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">입금시간</span>
            <span>{booking.deposited_at}</span>
          </div>
        </div>
      </div>

      {/* 입금 계좌 */}
      {event && (status === "pending" || status === "confirmed") && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">입금 계좌</h2>
            <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
              {event.bank_info}
            </p>
          </div>
        </>
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
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
