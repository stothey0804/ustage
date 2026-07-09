"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdditionalPurchaseProps {
  eventId: string;
  /** 1매 가격 (0 = 무료) */
  price: number;
  /** 예약자 이메일 — 회원은 예약의 email, 비회원은 조회에 쓴 email */
  email: string;
  /** 비회원 경로에서만 필요 — 조회에 사용한 비밀번호로 본인 확인 */
  password?: string;
  onSuccess?: () => void;
}

/**
 * 기존 예약자의 추가 구매.
 * 신규 예매 폼에서는 동일 이메일이 차단되고, 본인 확인이 끝난
 * 예약 조회 화면에서만 이 컴포넌트로 추가 예약을 생성한다.
 */
export function AdditionalPurchase({
  eventId,
  price,
  email,
  password,
  onSuccess,
}: AdditionalPurchaseProps) {
  const isFree = price === 0;
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [depositorName, setDepositorName] = useState("");
  const [depositedAt, setDepositedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalAmount = price * quantity;

  const handleSubmit = () => {
    if (!isFree && (!depositorName.trim() || !depositedAt.trim())) {
      setError("입금자명과 입금 예상 시간을 입력해 주세요.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          additional: true,
          email,
          password: password || undefined,
          quantity,
          depositor_name: depositorName,
          deposited_at: depositedAt,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error ?? "추가 구매 처리 중 오류가 발생했습니다.");
        return;
      }

      toast.success(
        isFree
          ? "추가 신청이 완료되었습니다."
          : "추가 구매가 접수되었습니다. 입금 확인 후 확정됩니다."
      );
      setOpen(false);
      setQuantity(1);
      setDepositorName("");
      setDepositedAt("");
      onSuccess?.();
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        추가 구매
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isFree ? "추가 신청" : "추가 구매"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              기존 예약과 별도의 예약으로 추가됩니다. 이름과 추가 정보는 기존
              예약에서 그대로 가져와요.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="add-quantity">매수 *</Label>
              <Select
                value={String(quantity)}
                onValueChange={(v) => setQuantity(Number(v))}
              >
                <SelectTrigger id="add-quantity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}매
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isFree && (
                <p className="text-xs text-muted-foreground">
                  총 입금액{" "}
                  <span className="font-medium text-foreground">
                    {totalAmount.toLocaleString()}원
                  </span>
                  {quantity > 1 &&
                    ` (${price.toLocaleString()}원 × ${quantity}매)`}
                </p>
              )}
            </div>

            {!isFree && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="add-depositor">입금자명 *</Label>
                  <Input
                    id="add-depositor"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    placeholder="입금자 이름 (계좌 표시명)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-deposited-at">
                    입금 예상 시간 *{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      (예: 오늘 오후 3시)
                    </span>
                  </Label>
                  <Input
                    id="add-deposited-at"
                    value={depositedAt}
                    onChange={(e) => setDepositedAt(e.target.value)}
                    placeholder="예: 오늘 오후 3시 / 내일 오전 11시"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isFree ? "추가 신청" : "추가 구매"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
