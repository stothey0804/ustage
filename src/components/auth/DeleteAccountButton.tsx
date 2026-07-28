"use client";

import { useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { deleteAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 실수 방지 — 이 단어를 정확히 입력해야 탈퇴 버튼이 활성화된다. */
const CONFIRM_WORD = "탈퇴";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      // 성공 시 서버 액션이 "/"로 redirect하므로 이 아래는 실행되지 않는다.
      const result = await deleteAccount();
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("탈퇴가 완료되었습니다.");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => {
          setConfirmText("");
          setError(null);
          setOpen(true);
        }}
      >
        회원 탈퇴
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>회원 탈퇴</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0 mt-0.5" />
              <p>탈퇴하면 계정을 되돌릴 수 없습니다.</p>
            </div>

            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <li>
                • 예매가 없는 내 스테이지는 함께 삭제됩니다. 포스터 이미지도
                지워집니다.
              </li>
              <li>
                •{" "}
                <span className="font-medium text-foreground">
                  예매 내역이 있는 스테이지가 남아 있으면 탈퇴할 수 없습니다.
                </span>{" "}
                주최자가 없으면 입금 확인·입장 처리를 할 수 없으니, 해당 스테이지를
                먼저 정리해 주세요.
              </li>
              <li>
                • 내가 참석자로 넣은 예약은 주최자의 명단 보존을 위해 기록은 남고
                계정 연결만 끊깁니다. 탈퇴 후에는 그 예약을 조회할 수 없습니다.
              </li>
            </ul>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete">
                계속하려면 <span className="font-semibold">{CONFIRM_WORD}</span>
                를 입력해 주세요
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              돌아가기
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={isPending || confirmText.trim() !== CONFIRM_WORD}
              onClick={submit}
            >
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              탈퇴하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
