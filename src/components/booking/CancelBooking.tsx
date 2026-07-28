"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextView } from "@/components/RichTextView";

interface Props {
  bookingId: string;
  /** 취소·환불 규정 — 서버에서 sanitize된 HTML. 없으면 연락처 안내만 표시 */
  cancelPolicyHtml?: string;
  /** 주최자 연락처 — 환불 문의 안내 */
  contact?: string;
  /**
   * 비회원 본인 확인용 자격증명. 회원(세션 보유)은 전달하지 않는다.
   * 조회 화면에서 이미 검증된 값을 그대로 재사용한다.
   */
  credentials?: { email: string; password: string };
  /** 취소 성공 후 호출 — 클라이언트 상태 재조회용 (서버 컴포넌트는 자동 refresh) */
  onCancelled?: () => void;
  className?: string;
}

export function CancelBooking({
  bookingId,
  cancelPolicyHtml,
  contact,
  credentials,
  onCancelled,
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAgreed(false);
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          email: credentials?.email,
          password: credentials?.password,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "취소 처리 중 오류가 발생했습니다.");
        return;
      }

      setOpen(false);
      reset();
      toast.success("예약이 취소되었습니다.");
      onCancelled?.();
      router.refresh();
    } catch {
      setError("취소 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <XCircle className="size-3.5 mr-1.5" />
        예약 취소
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (submitting) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>예약을 취소하시겠어요?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              취소하면 발급된 입장 QR은 사용할 수 없고, 좌석은 다른 참석자에게
              반환됩니다. 취소는 되돌릴 수 없어요.
            </p>

            {cancelPolicyHtml ? (
              <div className="rounded-lg border bg-muted/40 px-3.5 py-3">
                <p className="text-xs font-semibold">취소·환불 규정</p>
                <RichTextView
                  html={cancelPolicyHtml}
                  className="mt-2 text-xs text-muted-foreground"
                />
              </div>
            ) : (
              <p className="rounded-lg border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
                등록된 취소·환불 규정이 없습니다. 환불 조건은 주최자에게 직접
                확인해 주세요.
              </p>
            )}

            {contact && (
              <p className="text-xs text-muted-foreground">
                환불 문의:{" "}
                <span className="font-medium text-foreground">{contact}</span>
              </p>
            )}

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="accent-primary mt-0.5"
              />
              <span>
                위 내용을 확인했으며, 예약 취소에 동의합니다.
              </span>
            </label>

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
              disabled={submitting}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              돌아가기
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={submitting || !agreed}
              onClick={submit}
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              예약 취소하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
