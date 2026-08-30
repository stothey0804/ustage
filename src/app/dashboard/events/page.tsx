import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, MapPin, Mic, Plus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { deriveAutoStatus } from "@/lib/auto-status";
import { myStaffEventIds } from "@/lib/event-access";
import { formatKST } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/StatusBadge";

const LIST_DATE_FORMAT = "yyyy. M. d. (EEE) HH:mm";

/** 오늘 기준 남은 일수 (지났으면 음수) */
function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

function whenLabel(eventDate: string, endDate: string | null): string {
  const days = daysUntil(endDate ?? eventDate);
  if (days < 0) return "지난 공연";
  const untilStart = daysUntil(eventDate);
  if (untilStart > 0) return `D-${untilStart}`;
  if (untilStart === 0) return "오늘";
  return "진행 중";
}

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const COLUMNS =
    "id, title, event_date, event_end_date, venue, status, capacity, slug, booking_start, booking_end, performer_id";

  const { data: ownEvents, error } = await supabase
    .from("events")
    .select(COLUMNS)
    .eq("performer_id", user.id)
    .order("event_date", { ascending: false });

  if (error) {
    console.error("[events list]", error);
    throw new Error("스테이지 목록을 불러오지 못했습니다.");
  }

  // 스태프로 참여 중인 스테이지도 함께 보여준다
  const staffEventIds = await myStaffEventIds(supabase, user.id);
  const { data: staffEvents } = staffEventIds.length
    ? await supabase
        .from("events")
        .select(COLUMNS)
        .in("id", staffEventIds)
        .order("event_date", { ascending: false })
    : { data: [] };

  const events = [...(ownEvents ?? []), ...(staffEvents ?? [])].sort((a, b) =>
    (b.event_date ?? "").localeCompare(a.event_date ?? "")
  );
  const staffIdSet = new Set(staffEventIds);

  // 카드 하단 상태 노트용 입금대기 건수 — 내 스테이지 전체를 한 번에 집계
  const eventIds = events.map((e) => e.id);
  const pendingByEvent = new Map<string, number>();
  if (eventIds.length > 0) {
    const { data: pendingRows } = await supabase
      .from("bookings")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "pending");
    for (const row of pendingRows ?? []) {
      pendingByEvent.set(
        row.event_id,
        (pendingByEvent.get(row.event_id) ?? 0) + 1
      );
    }
  }

  const derived = events.map((event) => ({
    event,
    status: (deriveAutoStatus(event) ?? event.status ?? "draft") as string,
    isStaff: staffIdSet.has(event.id),
  }));
  const openCount = derived.filter((d) => d.status === "open").length;

  if (events.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-16 text-center">
        <Mic className="size-10 text-muted-foreground/60" strokeWidth={1.5} />
        <div className="space-y-1.5">
          <p className="text-15 font-semibold">
            아직 등록한 스테이지가 없습니다
          </p>
          <p className="text-13 leading-relaxed text-muted-foreground">
            첫 스테이지를 만들어 예매 링크를 공유해보세요.
            <br />
            좌석 수와 가격만 정하면 바로 열립니다.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard/events/new">스테이지 만들기</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/guide">예매를 여는 순서 보기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-17 font-bold tracking-tight sm:text-2xl">
            내 스테이지
          </h1>
          <p className="text-xs text-muted-foreground">
            {events.length}개 · 진행 중 {openCount}개
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="size-4 mr-1.5" />
            스테이지 추가
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {derived.map(({ event, status, isStaff }) => {
          const pending = pendingByEvent.get(event.id) ?? 0;
          const isDraft = status === "draft";
          return (
            <div
              key={event.id}
              className="space-y-3 rounded-4xl bg-card p-4 shadow-md ring-1 ring-foreground/5"
            >
              <div className="flex items-center gap-2">
                <EventStatusBadge status={status} />
                <span className="text-xs text-muted-foreground">
                  {whenLabel(event.event_date, event.event_end_date)}
                </span>
                {isStaff && (
                  <span className="ml-auto inline-flex h-5 items-center gap-1.5 rounded-full bg-secondary px-2 text-xs font-medium text-muted-foreground">
                    <Users className="size-3" />
                    스태프
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="truncate text-15 font-semibold">
                  {event.title}
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {formatKST(event.event_date, LIST_DATE_FORMAT)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {event.venue}
                  </span>
                  {event.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {event.capacity}석
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span
                  className={
                    pending > 0 && status === "open"
                      ? "text-13 font-medium text-primary"
                      : "text-13 text-muted-foreground"
                  }
                >
                  {isDraft
                    ? "작성 중 — 아직 예매를 받지 않아요"
                    : pending > 0
                      ? `입금대기 ${pending}건`
                      : "확인할 입금이 없어요"}
                </span>
                <Button asChild variant="outline" size="xs" className="shrink-0">
                  <Link
                    href={
                      isDraft && !isStaff
                        ? `/dashboard/events/${event.id}/edit`
                        : `/dashboard/events/${event.id}`
                    }
                  >
                    {isDraft && !isStaff ? "이어 쓰기" : "상세보기"}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
