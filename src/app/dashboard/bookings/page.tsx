import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatKST } from "@/lib/date";
import { effectiveQuantity } from "@/lib/seats";
import { formatBookingNoRange } from "@/lib/booking-code";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge } from "@/components/StatusBadge";

const LIST_DATE_FORMAT = "yyyy. M. d. (EEE) HH:mm";

type TicketRow = {
  id: string;
  booking_no: number | null;
  status: string;
  quantity: number | null;
  cancelled_quantity: number | null;
  created_at: string | null;
  events: {
    id: string;
    title: string;
    event_date: string;
    event_end_date: string | null;
    venue: string;
    price: number;
    slug: string;
  } | null;
};

/** 오늘 기준 남은 일수 (지났으면 음수) */
function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_no, status, quantity, cancelled_quantity, created_at, events(id, title, event_date, event_end_date, venue, price, slug)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) console.error("[bookings list]", error);

  const rows = (data ?? []) as unknown as TicketRow[];
  const byDate = (a: TicketRow, b: TicketRow) =>
    (a.events?.event_date ?? "").localeCompare(b.events?.event_date ?? "");

  // 지난 공연 판정은 종료 일시(없으면 시작 일시) 기준
  const isPast = (row: TicketRow) =>
    !row.events ||
    daysUntil(row.events.event_end_date ?? row.events.event_date) < 0;

  const active = rows.filter((r) => !isPast(r) && r.status !== "cancelled");
  const confirmed = active.filter((r) => r.status === "confirmed").sort(byDate);
  const pending = active.filter((r) => r.status === "pending").sort(byDate);
  const past = rows.filter((r) => isPast(r) || r.status === "cancelled").sort(byDate).reverse();

  const [upcoming, ...restConfirmed] = confirmed;

  if (rows.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-16 text-center">
        <Ticket className="size-10 text-muted-foreground/60" strokeWidth={1.5} />
        <div className="space-y-1.5">
          <p className="text-15 font-semibold">아직 예매한 공연이 없습니다</p>
          <p className="text-13 leading-relaxed text-muted-foreground">
            받은 예매 링크로 예매하면 QR 티켓이 여기에 모입니다.
            <br />
            비회원으로 예매했다면 그 링크의 &lsquo;비회원 예약 조회&rsquo;에서 확인할 수
            있어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-17 font-bold tracking-tight sm:text-2xl">내 티켓</h1>

      {/* 다가오는 티켓 — 입장에 바로 쓰는 한 장을 크게 */}
      {upcoming?.events && (
        <section className="space-y-3.5 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              <BookingStatusBadge
                status={upcoming.status}
                isFree={upcoming.events.price === 0}
              />
              <span className="font-mono text-13 font-medium text-primary">
                {formatBookingNoRange(
                  upcoming.booking_no,
                  upcoming.quantity ?? 1,
                  upcoming.id
                )}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {daysUntil(upcoming.events.event_date) > 0
                ? `${daysUntil(upcoming.events.event_date)}일 뒤 입장`
                : "오늘 입장"}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-17 font-semibold leading-snug">
              {upcoming.events.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatKST(upcoming.events.event_date, LIST_DATE_FORMAT)} ·{" "}
              {upcoming.events.venue} · {effectiveQuantity(upcoming)}매
            </p>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link href={`/dashboard/bookings/${upcoming.id}`}>QR 티켓 보기</Link>
          </Button>
        </section>
      )}

      {/* 확정된 나머지 */}
      {restConfirmed.length > 0 && (
        <TicketSection title="예매 확정" rows={restConfirmed} />
      )}

      {/* 입금 확인 중 */}
      {pending.length > 0 && (
        <TicketSection title="입금 확인 중" rows={pending} />
      )}

      {/* 지난 티켓 */}
      {past.length > 0 && <TicketSection title="지난 티켓" rows={past} muted />}
    </div>
  );
}

function TicketSection({
  title,
  rows,
  muted = false,
}: {
  title: string;
  rows: TicketRow[];
  muted?: boolean;
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-13 font-semibold">
        {title} {rows.length}건
      </h2>
      <div className="divide-y rounded-4xl bg-card shadow-md ring-1 ring-foreground/5">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/dashboard/bookings/${row.id}`}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-4xl last:rounded-b-4xl hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p
                className={
                  muted
                    ? "truncate text-sm text-muted-foreground"
                    : "truncate text-sm font-medium"
                }
              >
                {row.events?.title ?? "알 수 없는 스테이지"}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.events
                  ? `${formatKST(row.events.event_date, LIST_DATE_FORMAT)} · ${effectiveQuantity(row)}매`
                  : `${effectiveQuantity(row)}매`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <BookingStatusBadge
                status={row.status}
                isFree={row.events?.price === 0}
              />
              <span className="font-mono text-xs font-medium text-primary">
                {formatBookingNoRange(row.booking_no, row.quantity ?? 1, row.id)}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Separator className="sm:hidden" />
    </section>
  );
}
