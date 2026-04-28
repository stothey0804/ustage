"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

import { updateEventStatus } from "@/app/actions/event";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

type Event = Tables<"events">;

interface StatusTransitionProps {
  eventId: string;
  currentStatus: "draft" | "open" | "closed" | "ended";
  event: Event;
}

export function StatusTransition({
  eventId,
  currentStatus,
  event,
}: StatusTransitionProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function canOpen(): { ok: boolean; reason?: string } {
    if (!event.booking_start || !event.booking_end) {
      return { ok: false, reason: "예매 기간을 먼저 설정해 주세요." };
    }
    return { ok: true };
  }

  function handleTransition(newStatus: "draft" | "open" | "closed" | "ended") {
    if (newStatus === "open") {
      const check = canOpen();
      if (!check.ok) {
        toast.error(check.reason);
        return;
      }
    }

    startTransition(async () => {
      const result = await updateEventStatus(eventId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        const labels: Record<string, string> = {
          draft: "오픈 전으로 변경되었습니다.",
          open: "티켓이 오픈되었습니다.",
          closed: "예매가 마감되었습니다.",
          ended: "행사가 종료되었습니다.",
        };
        toast.success(labels[newStatus]);
        router.refresh();
      }
    });
  }

  // 행사 종료 — 변경 불가
  if (currentStatus === "ended") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <CheckCircle2 className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">행사가 종료되었습니다</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-xs text-muted-foreground mr-auto">상태 변경</span>

      {currentStatus === "draft" && (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleTransition("open")}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <ArrowRight className="size-4 mr-1.5" />
          )}
          티켓 오픈
        </Button>
      )}

      {currentStatus === "open" && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleTransition("closed")}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Lock className="size-4 mr-1.5" />
          )}
          예매 마감
        </Button>
      )}

      {currentStatus === "closed" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTransition("open")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <ArrowRight className="size-4 mr-1.5" />
            )}
            재오픈
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTransition("ended")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            행사 종료
          </Button>
        </>
      )}
    </div>
  );
}
