import { Check } from "lucide-react";
import { formatKST } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Event = Pick<
  Tables<"events">,
  "status" | "booking_start" | "booking_end" | "event_date" | "event_end_date"
>;

type Phase = {
  label: string;
  /** 이 단계에 해당하는 일시(있으면 표기) */
  at: string | null;
};

/**
 * 이벤트 생애주기 단계 표시.
 * 오픈 전 → 예매 오픈 → 예매 종료 → 이벤트 전 → 이벤트 중 → 이벤트 종료
 * 저장된 status와 일시(booking_start/end, event_date/end_date)로 현재 단계를 계산한다.
 * 시각 비교는 절대 시각(instant) 기준이라 서버 타임존과 무관하게 정확하다.
 */
function currentPhaseIndex(event: Event): number {
  const now = Date.now();
  const bs = event.booking_start ? new Date(event.booking_start).getTime() : null;
  const be = event.booking_end ? new Date(event.booking_end).getTime() : null;
  const ed = event.event_date ? new Date(event.event_date).getTime() : null;
  const eeRaw = event.event_end_date ?? event.event_date;
  const ee = eeRaw ? new Date(eeRaw).getTime() : null;
  const status = event.status ?? "draft";

  if (status === "ended" || (ee != null && now >= ee)) return 5; // 이벤트 종료
  if (ed != null && now >= ed) return 4; // 이벤트 중
  if (status === "closed" || (be != null && now >= be)) return 3; // 이벤트 전 (예매 종료됨)
  if (status === "open" || (bs != null && now >= bs)) return 1; // 예매 오픈
  return 0; // 오픈 전
}

export function EventLifecycle({ event }: { event: Event }) {
  const phases: Phase[] = [
    { label: "오픈 전", at: null },
    { label: "예매 오픈", at: event.booking_start },
    { label: "예매 종료", at: event.booking_end },
    { label: "이벤트 전", at: null },
    { label: "이벤트 중", at: event.event_date },
    { label: "이벤트 종료", at: event.event_end_date ?? event.event_date },
  ];
  const current = currentPhaseIndex(event);

  return (
    <div className="rounded-2xl border bg-muted/30 px-4 py-3">
      <p className="mb-3 text-xs text-muted-foreground">진행 상태</p>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {phases.map((phase, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={phase.label}
              className="flex min-w-16 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex w-full items-center">
                {/* 왼쪽 연결선 */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0
                      ? "opacity-0"
                      : i <= current
                        ? "bg-primary"
                        : "bg-border",
                  )}
                />
                {/* 노드 */}
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                    state === "done" && "border-primary bg-primary text-primary-foreground",
                    state === "current" &&
                      "border-primary bg-primary/15 text-primary ring-2 ring-primary/30",
                    state === "todo" && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {state === "done" ? <Check className="size-3" /> : i + 1}
                </span>
                {/* 오른쪽 연결선 */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === phases.length - 1
                      ? "opacity-0"
                      : i < current
                        ? "bg-primary"
                        : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-center text-[11px] leading-tight",
                  state === "current"
                    ? "font-semibold text-primary"
                    : state === "done"
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {phase.label}
              </span>
              {phase.at && (
                <span className="whitespace-nowrap text-center text-[10px] leading-tight text-muted-foreground">
                  {formatKST(phase.at, "M.d HH:mm")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
