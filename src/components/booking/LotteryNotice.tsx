import { Shuffle } from "lucide-react";

import { LOTTERY_NOTICE_TEXT } from "@/lib/lottery-notice";
import { cn } from "@/lib/utils";

/** 입장번호가 현장 추첨 기준이라는 강조 안내 — 문구는 lib/lottery-notice.ts가 원본 */
export function LotteryNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl bg-primary/8 px-3.5 py-3 ring-1 ring-primary/20",
        className
      )}
    >
      <Shuffle className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-13 leading-relaxed">
        <span className="font-semibold text-foreground">
          {LOTTERY_NOTICE_TEXT.lead}
        </span>{" "}
        <span className="text-muted-foreground">
          {LOTTERY_NOTICE_TEXT.action}
        </span>
      </p>
    </div>
  );
}
