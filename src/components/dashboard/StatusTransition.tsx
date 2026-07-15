"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

import { updateEventStatus } from "@/app/actions/event";
import { Button } from "@/components/ui/button";

interface StatusTransitionProps {
  eventId: string;
  currentStatus: "draft" | "open" | "closed" | "ended";
}

export function StatusTransition({
  eventId,
  currentStatus,
}: StatusTransitionProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTransition(newStatus: "draft" | "open" | "closed" | "ended") {
    // 오픈 조건 검증은 서버(updateEventStatus)에서 수행한다.
    // 예매 기간 미설정도 즉시 수동 오픈으로 허용하므로 여기서 막지 않는다.
    startTransition(async () => {
      const result = await updateEventStatus(eventId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        const labels: Record<string, string> = {
          draft: "오픈 전으로 변경되었습니다.",
          open: "티켓이 오픈되었습니다.",
          closed: "예매가 마감되었습니다.",
          ended: "스테이지가 종료되었습니다.",
        };
        toast.success(labels[newStatus]);
        router.refresh();
      }
    });
  }

  // 행사 종료 — 변경 불가
  if (currentStatus === "ended") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3">
        <CheckCircle2 className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">스테이지가 종료되었습니다</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3">
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
            스테이지 종료
          </Button>
        </>
      )}
    </div>
  );
}
