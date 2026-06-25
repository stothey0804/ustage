import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 상태 뱃지 — 색을 꽉 채우는 대신 톤다운 + 상태 점으로 위계를 만든다.
 * - live: 진행/긍정 (티켓 오픈 · 입금완료 · 참가확정) — teal 틴트
 * - wait: 중립 대기 (오픈 전 · 입금대기) — 회색 채움
 * - done: 종료/취소 (예매 마감 · 행사 종료 · 취소) — 외곽선
 *
 * 앱의 둥근 정체성에 맞춰 pill(rounded-full) 형태를 따른다.
 */
type StatusTone = "live" | "wait" | "done";

const TONE_CLASSES: Record<StatusTone, string> = {
  live: "bg-primary/10 text-primary",
  wait: "bg-secondary text-muted-foreground",
  done: "border border-border text-muted-foreground",
};

function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

const EVENT_STATUS: Record<string, { tone: StatusTone; label: string }> = {
  draft: { tone: "wait", label: "오픈 전" },
  open: { tone: "live", label: "티켓 오픈" },
  closed: { tone: "done", label: "예매 마감" },
  ended: { tone: "done", label: "행사 종료" },
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const info = EVENT_STATUS[status ?? "draft"] ?? EVENT_STATUS.draft;
  return (
    <StatusBadge tone={info.tone} className={className}>
      {info.label}
    </StatusBadge>
  );
}

export function BookingStatusBadge({
  status,
  isFree = false,
  className,
}: {
  status: string;
  isFree?: boolean;
  className?: string;
}) {
  if (status === "confirmed") {
    return (
      <StatusBadge tone="live" className={className}>
        {isFree ? "참가확정" : "입금완료"}
      </StatusBadge>
    );
  }
  if (status === "cancelled") {
    return (
      <StatusBadge tone="done" className={className}>
        취소
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="wait" className={className}>
      입금대기
    </StatusBadge>
  );
}
