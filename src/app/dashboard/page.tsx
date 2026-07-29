import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic, Ticket } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { deriveAutoStatus } from "@/lib/auto-status";
import { getAccountEmail } from "@/lib/account-email";
import { formatKST } from "@/lib/date";
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

/** 인사말에 쓸 호칭 — 별도 프로필 이름이 없어 이메일 로컬파트를 쓴다. */
function greetingName(email: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  return local ? local : null;
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
    events.find((e) => daysUntil(e.event_end_date ?? e.event_date) >= 0) ?? null;

  // 요약 카드에 필요한 좌석·입금대기 집계 (해당 1건만 조회)
  let pendingCount = 0;
  let confirmedSeats = 0;
  let oldestPendingDays: number | null = null;
  if (upcomingEvent) {
    const { data: rows } = await supabase
      .from("bookings")
      .select("status, quantity, created_at")
      .eq("event_id", upcomingEvent.id);
    for (const row of rows ?? []) {
      if (row.status === "pending") {
        pendingCount += 1;
        if (row.created_at) {
          const passed = Math.max(-daysUntil(row.created_at), 0);
          oldestPendingDays = Math.max(oldestPendingDays ?? 0, passed);
        }
      }
      if (row.status === "confirmed") confirmedSeats += row.quantity ?? 1;
    }
  }

  // 내가 예매한 티켓 — 가장 가까운 미종료 1건
  const { data: myBookings } = await supabase
    .from("bookings")
    .select("id, status, quantity, events(title, event_date, venue, price)")
    .eq("user_id", user.id)
    .neq("status", "cancelled");

  type TicketRow = {
    id: string;
    status: string;
    quantity: number | null;
    events: {
      title: string;
      event_date: string;
      venue: string;
      price: number;
    } | null;
  };

  const tickets = ((myBookings ?? []) as unknown as TicketRow[])
    .filter((b) => b.events && daysUntil(b.events.event_date) >= 0)
    .sort((a, b) =>
      (a.events?.event_date ?? "").localeCompare(b.events?.event_date ?? "")
    );
  const upcomingTicket = tickets[0] ?? null;
  const pendingTickets = tickets.filter((t) => t.status === "pending").length;

  const name = greetingName(getAccountEmail(user));
  const isHost = events.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 인사 — 지금 신경 쓸 일 한 줄 */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {name ? `${name}님, ` : ""}
          {upcomingEvent
            ? `공연이 ${ddayLabel(upcomingEvent.event_date)}${daysUntil(upcomingEvent.event_date) > 0 ? " 남았어요" : "이에요"}`
            : upcomingTicket?.events
              ? `다음 공연이 ${ddayLabel(upcomingTicket.events.event_date)}${daysUntil(upcomingTicket.events.event_date) > 0 ? " 남았어요" : "이에요"}`
              : "반가워요"}
        </h1>
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
                {upcomingTicket.quantity ?? 1}매
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

      {/* 내가 여는 스테이지 요약 (Z2) / 주최 유도 (Z3) */}
      {isHost ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">내가 여는 스테이지</h2>
            <Button asChild variant="ghost" size="xs">
              <Link href="/dashboard/events">전체 보기</Link>
            </Button>
          </div>

          {upcomingEvent ? (
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
                      {confirmedSeats} / {upcomingEvent.capacity}석
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(Math.round((confirmedSeats / upcomingEvent.capacity) * 100), 100)}%`,
                      }}
                    />
                  </div>
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
                    명단 확인
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
      ) : (
        <section className="space-y-3 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-3xl bg-primary/10">
              <Mic className="size-5 text-primary" />
            </span>
            <p className="text-[15px] font-semibold">공연을 열어보고 싶다면</p>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            지금 쓰는 계정으로 스테이지를 만들 수 있습니다. 좌석 수와 가격을 정하면
            비공개 예매 링크가 만들어지고, 내 스테이지 탭에서 명단을 관리합니다.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard/events/new">스테이지 만들기</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/guide">예매를 여는 순서 보기</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
