"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";

import { resetDraws, runDraw, type DrawResult } from "@/app/actions/draw";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PastDrawRound = {
  round: number;
  winners: { bookingNo: number; maskedName: string; maskedEmail: string }[];
};

interface Props {
  eventId: string;
  /** 입장 완료(티켓 1장 이상 체크인)된 예매 수 — 추첨 대상 */
  candidateCount: number;
  /** 후보들의 예매번호 — 추첨 연출에서 굴릴 숫자로 쓴다 */
  candidateNos: number[];
  /** 지난 회차 기록 (최신 회차 먼저) */
  pastRounds: PastDrawRound[];
}

/** 숫자가 굴러가는 연출 최소 시간 — 결과가 즉시 와도 이만큼은 보여준다 */
const ROLL_MIN_MS = 1600;
const ROLL_TICK_MS = 70;

/**
 * 현장 추첨 — 입장 완료된 참석자만 대상으로 여러 번 뽑는다.
 * 추첨을 누르면 모달이 열려 번호가 굴러가고, 결과는 큰 번호로 보여준다
 * (현장에서 화면을 함께 보는 상황을 전제한다).
 * 기록은 서버에 회차별로 저장되므로 새로고침해도 이력과 '이전 당첨자 제외'가 유지된다.
 */
export function DrawPanel({
  eventId,
  candidateCount,
  candidateNos,
  pastRounds,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState("1");
  const [excludePrevious, setExcludePrevious] = useState(true);

  const [open, setOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollNo, setRollNo] = useState<number | null>(null);
  const [result, setResult] = useState<DrawResult | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [resetOpen, setResetOpen] = useState(false);

  const alreadyWon = pastRounds.reduce(
    (sum, round) => sum + round.winners.length,
    0
  );

  function stopRoll() {
    if (rollTimer.current) {
      clearInterval(rollTimer.current);
      rollTimer.current = null;
    }
  }

  function draw() {
    // 연출: 모달을 먼저 열고 후보 번호를 굴린다 (effect 없이 클릭 시점에 시작)
    setResult(null);
    setRolling(true);
    setOpen(true);
    const pool = candidateNos.length > 0 ? candidateNos : [0];
    setRollNo(pool[Math.floor(Math.random() * pool.length)]);
    stopRoll();
    rollTimer.current = setInterval(() => {
      setRollNo(pool[Math.floor(Math.random() * pool.length)]);
    }, ROLL_TICK_MS);

    const startedAt = Date.now();

    startTransition(async () => {
      const res = await runDraw(eventId, {
        count: Number(count),
        excludePrevious,
      });

      // 결과가 즉시 와도 최소 시간은 굴린다
      const remaining = ROLL_MIN_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      stopRoll();
      setRolling(false);

      if ("error" in res) {
        setOpen(false);
        toast.error(res.error);
        return;
      }

      setResult(res);
      router.refresh();
    });
  }

  function closeModal(next: boolean) {
    if (rolling) return;
    setOpen(next);
    if (!next) {
      stopRoll();
      setResult(null);
    }
  }

  function reset() {
    setResetOpen(false);
    startTransition(async () => {
      const res = await resetDraws(eventId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setResult(null);
      toast.success("추첨 기록을 초기화했습니다.");
      router.refresh();
    });
  }

  const winners = result?.winners ?? [];
  const single = winners.length === 1;

  return (
    <div className="max-w-2xl space-y-5">
      {/* 추첨 설정 */}
      <div className="space-y-4 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">현장 추첨</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            QR 스캔으로 <span className="font-medium text-foreground">입장 처리된
            참석자</span>만 추첨에 들어갑니다. 지금 대상은{" "}
            <span className="font-mono font-medium text-primary">
              {candidateCount}명
            </span>
            {alreadyWon > 0 && ` · 지금까지 당첨 ${alreadyWon}명`}
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="draw-count">뽑을 인원</Label>
            <Input
              id="draw-count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-24"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-[13px]">
            <input
              type="checkbox"
              className="accent-primary"
              checked={excludePrevious}
              onChange={(e) => setExcludePrevious(e.target.checked)}
            />
            이전 당첨자 제외
          </label>

          <Button
            type="button"
            size="lg"
            className="ml-auto gap-1.5"
            disabled={isPending || candidateCount === 0}
            onClick={draw}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Shuffle className="size-4" />
            )}
            추첨하기
          </Button>
        </div>

        {candidateCount === 0 && (
          <p className="rounded-3xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
            아직 입장 처리된 참석자가 없습니다. QR 스캔으로 입장을 확인한 뒤 추첨해
            주세요.
          </p>
        )}
      </div>

      {/* 지난 회차 */}
      {pastRounds.length > 0 && (
        <div className="space-y-3 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">
              추첨 기록 {pastRounds.length}회
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={() => setResetOpen(true)}
            >
              기록 초기화
            </Button>
          </div>

          <div className="space-y-3">
            {pastRounds.map((round) => (
              <div key={round.round} className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {round.round}회차 · {round.winners.length}명
                </p>
                <ul className="flex flex-wrap gap-2">
                  {round.winners.map((winner) => (
                    <li
                      key={`${round.round}-${winner.bookingNo}`}
                      className="flex items-center gap-2 rounded-full bg-input/50 px-3 py-1.5 text-[13px]"
                    >
                      <span className="font-mono font-medium text-primary">
                        #{winner.bookingNo}
                      </span>
                      <span>{winner.maskedName}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {winner.maskedEmail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추첨 연출 + 결과 모달 */}
      <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          showCloseButton={!rolling}
        >
          <DialogHeader>
            <DialogTitle className="text-center">
              {rolling
                ? "추첨 중"
                : `${result?.round ?? ""}회차 당첨자 ${winners.length}명`}
            </DialogTitle>
          </DialogHeader>

          {rolling ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <p
                className="font-mono text-6xl font-bold tabular-nums text-primary sm:text-7xl"
                aria-live="off"
              >
                #{rollNo ?? "-"}
              </p>
              <p className="text-[13px] text-muted-foreground">
                입장 완료 {candidateCount}명 중에서 뽑고 있어요…
              </p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div
                className={
                  single
                    ? "flex flex-col items-center gap-3 py-6"
                    : "grid gap-3 sm:grid-cols-2"
                }
                aria-live="polite"
              >
                {winners.map((winner) => (
                  <div
                    key={winner.bookingNo}
                    className={
                      single
                        ? "flex flex-col items-center gap-2"
                        : "flex flex-col items-center gap-1 rounded-4xl bg-primary/8 px-4 py-5"
                    }
                  >
                    <span
                      className={
                        single
                          ? "font-mono text-7xl font-bold tabular-nums text-primary sm:text-8xl"
                          : "font-mono text-5xl font-bold tabular-nums text-primary"
                      }
                    >
                      #{winner.bookingNo}
                    </span>
                    <span
                      className={
                        single ? "text-xl font-semibold" : "text-base font-semibold"
                      }
                    >
                      {winner.maskedName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {winner.maskedEmail}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Trophy className="size-3.5 text-primary" />
                후보 {result?.candidateCount ?? 0}명 중 · 본인 확인은 예매번호와
                이메일 앞자리로
              </div>
            </div>
          )}

          {!rolling && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => closeModal(false)}
                disabled={isPending}
              >
                닫기
              </Button>
              <Button onClick={draw} disabled={isPending} className="gap-1.5">
                <Shuffle className="size-4" />
                한 번 더 추첨
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>추첨 기록 초기화</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            지금까지의 회차와 당첨자 기록이 모두 삭제됩니다. 회차는 1회차부터 다시
            시작하고, &lsquo;이전 당첨자 제외&rsquo;도 기준이 사라집니다. 되돌릴 수
            없습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={reset} disabled={isPending}>
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
