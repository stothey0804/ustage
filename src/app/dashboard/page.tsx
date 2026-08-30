import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { deriveAutoStatus } from "@/lib/auto-status";
import { formatKST } from "@/lib/date";
import {
  confirmedSeats,
  effectiveQuantity,
  occupancyPercent,
  occupiedSeats,
} from "@/lib/seats";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge, EventStatusBadge } from "@/components/StatusBadge";

const LIST_DATE_FORMAT = "yyyy. M. d. (EEE) HH:mm";

/** 오늘 기준 남은 일수 (지났으면 음수) */
function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function ddayLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days > 0) return `D-${days}`;
  if (days === 0) return "오늘";
  return "지난 공연";
}

/**
 * 종료 판정은 시각 기준으로 정확히 한다.
 * daysUntil은 24시간 단위 올림이라 종료 후 하루까지 0("오늘")로 잡혀,
 * 이미 끝난 스테이지에 "공연이 오늘이에요"가 뜨는 문제가 있었다.
 */
function isPast(iso: string): boolean {
  const t = new Date(iso).getTime();
  return !isNaN(t) && t < Date.now();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 내가 여는 스테이지 — 가장 가까운 미종료 1건을 요약에 쓴다
  const { data: myEvents } = await supabase
    .from("events")
    .select(
      "id, title, event_date, event_end_date, venue, status, capacity, booking_start, booking_end"
    )
    .eq("performer_id", user.id)
    .order("event_date", { ascending: true });

  const events = myEvents ?? [];
  const upcomingEvent =
    events.find((e) => !isPast(e.event_end_date ?? e.event_date)) ?? null;

  // 요약 카드에 필요한 좌석·입금대기 집계 (해당 1건만 조회)
  let pendingCount = 0;
  let occupied = 0;
  let confirmed = 0;
  let seatPercent = 0;
  let oldestPendingDays: number | null = null;
  if (upcomingEvent) {
    const { data: rows } = await supabase
      .from("bookings")
      .select("status, quantity, cancelled_quantity, created_at")
      .eq("event_id", upcomingEvent.id);
    for (const row of rows ?? []) {
      if (row.status === "pending" && row.created_at) {
        const passed = Math.max(-daysUntil(row.created_at), 0);
        oldestPendingDays = Math.max(oldestPendingDays ?? 0, passed);
      }
      if (row.status === "pending") pendingCount += 1;
    }
    // 좌석 점유 기준은 예매 차단 기준과 같다 — 취소 제외(입금대기 포함)
    occupied = occupiedSeats(rows ?? []);
    confirmed = confirmedSeats(rows ?? []);
    seatPercent = occupancyPercent(rows ?? [], upcomingEvent.capacity) ?? 0;
  }

  // 내가 예매한 티켓 — 가장 가까운 미종료 1건
  const { data: myBookings } = await supabase
    .from("bookings")
    .select(
      "id, status, quantity, cancelled_quantity, events(title, event_date, event_end_date, venue, price)"
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled");

  type TicketRow = {
    id: string;
    status: string;
    quantity: number | null;
    cancelled_quantity: number | null;
    events: {
      title: string;
      event_date: string;
      event_end_date: string | null;
      venue: string;
      price: number;
    } | null;
  };

  const tickets = ((myBookings ?? []) as unknown as TicketRow[])
    .filter(
      (b) => b.events && !isPast(b.events.event_end_date ?? b.events.event_date)
    )
    .sort((a, b) =>
      (a.events?.event_date ?? "").localeCompare(b.events?.event_date ?? "")
    );
  const upcomingTicket = tickets[0] ?? null;
  const pendingTickets = tickets.filter((t) => t.status === "pending").length;

  const isHost = events.length > 0;

  // 표시할 이름(프로필)이 없어 호칭은 쓰지 않고 '지금 상황'만 한 줄로 말한다.
  const headline = upcomingEvent
    ? daysUntil(upcomingEvent.event_date) > 0
      ? `공연이 ${ddayLabel(upcomingEvent.event_date)} 남았어요`
      : "공연이 오늘이에요"
    : upcomingTicket?.events
      ? daysUntil(upcomingTicket.events.event_date) > 0
        ? `다음 공연이 ${ddayLabel(upcomingTicket.events.event_date)} 남았어요`
        : "다음 공연이 오늘이에요"
      : "예정된 공연이 없어요";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 인사 — 지금 신경 쓸 일 한 줄 */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">{headline}</h1>
        <p className="text-[13px] text-muted-foreground">
          {isHost
            ? pendingCount > 0
              ? `입금대기 ${pendingCount}건을 확인하면 QR 티켓이 발송됩니다.`
              : "확인할 입금이 없어요."
            : pendingTickets > 0
              ? `입금대기 ${pendingTickets}건이 있어요. 입금이 확인되면 QR 티켓을 받습니다.`
              : "예매한 티켓과 내가 여는 스테이지를 한 계정에서 관리합니다."}
        </p>
      </div>

      {/* 내 티켓 요약 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">
            내 티켓 {tickets.length > 0 ? `${tickets.length}장` : ""}
          </h2>
          <Button asChild variant="ghost" size="xs">
            <Link href="/dashboard/bookings">전체 보기</Link>
          </Button>
        </div>

        {upcomingTicket?.events ? (
          <Link
            href={`/dashboard/bookings/${upcomingTicket.id}`}
            className="flex items-center gap-3 rounded-4xl bg-input/50 p-4 transition-colors hover:bg-input/70"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-3xl bg-card">
              <Ticket className="size-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {upcomingTicket.events.title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatKST(upcomingTicket.events.event_date, LIST_DATE_FORMAT)} ·{" "}
                {effectiveQuantity(upcomingTicket)}매
              </span>
            </span>
            <BookingStatusBadge
              status={upcomingTicket.status}
              isFree={upcomingTicket.events.price === 0}
              className="shrink-0"
            />
          </Link>
        ) : (
          <div className="rounded-4xl border border-dashed p-5 text-center">
            <p className="text-[13px] text-muted-foreground">
              다가오는 티켓이 없어요. 받은 예매 링크로 예매하면 여기에 모입니다.
            </p>
          </div>
        )}
      </section>

      {/* 내가 여는 스테이지 요약 (Z2) — 주최 이력이 없으면 내 티켓과 같은 빈 상태만 보여준다 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">내가 여는 스테이지</h2>
          <Button asChild variant="ghost" size="xs">
            <Link href="/dashboard/events">전체 보기</Link>
          </Button>
        </div>

        {!isHost ? (
          <div className="rounded-4xl border border-dashed p-5 text-center">
            <p className="text-[13px] text-muted-foreground">
              내가 만든 스테이지가 없어요.
            </p>
          </div>
        ) : upcomingEvent ? (
            <div className="space-y-3.5 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
              <div className="flex items-center gap-2">
                <EventStatusBadge
                  status={deriveAutoStatus(upcomingEvent) ?? upcomingEvent.status}
                />
                <span className="text-xs text-muted-foreground">
                  가장 가까운 공연 · {ddayLabel(upcomingEvent.event_date)}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-[17px] font-semibold leading-snug">
                  {upcomingEvent.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatKST(upcomingEvent.event_date, LIST_DATE_FORMAT)} ·{" "}
                  {upcomingEvent.venue}
                </p>
              </div>

              {upcomingEvent.capacity && (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium">좌석</span>
                    <span className="font-mono text-[15px] text-primary">
                      {occupied} / {upcomingEvent.capacity}석
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${seatPercent}%`,
                      }}
                    />
                  </div>
                  {occupied > confirmed && (
                    <p className="text-xs text-muted-foreground">
                      확정 {confirmed}석 · 입금대기 {occupied - confirmed}석
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {pendingCount > 0
                      ? `입금대기 ${pendingCount}건`
                      : "입금대기 없음"}
                  </p>
                  {pendingCount > 0 && oldestPendingDays !== null && (
                    <p className="text-xs text-muted-foreground">
                      {oldestPendingDays > 0
                        ? `가장 오래된 건 ${oldestPendingDays}일 경과`
                        : "가장 오래된 건 오늘 신청"}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/dashboard/events/${upcomingEvent.id}`}>
                    상세보기
                  </Link>
                </Button>
              </div>
            </div>
        ) : (
          <div className="rounded-4xl border border-dashed p-5 text-center">
            <p className="text-[13px] text-muted-foreground">
              예정된 스테이지가 없어요. 지난 스테이지는 전체 보기에서 확인할 수
              있습니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
