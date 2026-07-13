"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2 } from "lucide-react";

import {
  bookingFormSchema,
  type BookingFormValues,
} from "@/lib/validations/booking";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import { formatDepositTime } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import type { CustomField } from "@/lib/validations/event";

interface BookingFormProps {
  eventId: string;
  price: number;
  bankInfo: string;
  customFields: CustomField[];
  isLoggedIn: boolean;
  userEmail?: string;
  isOpen: boolean;
  closedReason?: string;
  /** 잔여석 기준 최대 예매 매수 (기본 20) */
  maxQuantity?: number;
}

type Step = "idle" | "form" | "success";

export function BookingForm({
  eventId,
  price,
  bankInfo,
  customFields,
  isLoggedIn,
  userEmail,
  isOpen,
  closedReason,
  maxQuantity = 20,
}: BookingFormProps) {
  const isFree = price === 0;
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  // 비회원 최종 확인 모달(네이티브 confirm 대체)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmValues, setConfirmValues] = useState<BookingFormValues | null>(
    null
  );
  // 중복 감지 시 보관해 두는 제출값 — "추가 예약" 확인 시 additional로 재제출
  const [pendingValues, setPendingValues] = useState<BookingFormValues | null>(
    null
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      email: userEmail ?? "",
      depositor_name: "",
      deposited_at: "",
      quantity: 1,
      password: "",
      custom_answers: {},
    },
  });

  const quantityValue = watch("quantity") || 1;
  const totalAmount = price * quantityValue;

  const onSubmit = (values: BookingFormValues) => {
    if (!isLoggedIn && (!values.password || values.password.length < 4)) {
      setError("password", { message: "비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    if (!isFree) {
      if (!values.depositor_name) {
        setError("depositor_name", { message: "입금자명을 입력해 주세요." });
        return;
      }
      if (!values.deposited_at) {
        setError("deposited_at", { message: "입금 예상 시간을 입력해 주세요." });
        return;
      }
    }

    if (!isLoggedIn) {
      // 비회원은 제출 후 수정 불가 — 최종 확인 모달을 띄운다.
      setConfirmValues(values);
      setConfirmOpen(true);
      return;
    }

    submitBooking(values, false);
  };

  const submitBooking = (values: BookingFormValues, additional: boolean) => {
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          name: values.name,
          email: values.email,
          depositor_name: values.depositor_name,
          deposited_at: formatDepositTime(values.deposited_at),
          quantity: values.quantity,
          password: values.password || undefined,
          custom_answers:
            Object.keys(values.custom_answers ?? {}).length > 0
              ? values.custom_answers
              : undefined,
          additional,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // 이미 예매한 이메일 → 추가 예약 여부 확인 모달
        if (!additional && res.status === 409 && json.code === "duplicate_email") {
          setPendingValues(values);
          setModalError(null);
          setDuplicateOpen(true);
          return;
        }
        const message = json.error ?? "예매 처리 중 오류가 발생했습니다.";
        if (additional) {
          setModalError(message);
        } else {
          setServerError(message);
        }
        return;
      }

      setDuplicateOpen(false);
      setStep("success");
    });
  };

  // 예매 불가 상태
  if (!isOpen) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {closedReason ?? "현재 예매를 받지 않습니다."}
        </p>
      </div>
    );
  }

  // 예매 완료
  if (step === "success") {
    return (
      <div className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="size-6 text-green-600 shrink-0" />
          <div>
            <p className="font-medium">
              {isFree ? "참가 신청이 완료되었습니다." : "예매가 완료되었습니다."}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isFree
                ? "참가가 확정되었습니다."
                : "입금 확인 후 예매가 확정됩니다."}
            </p>
          </div>
        </div>
        {!isFree && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                입금 계좌
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{bankInfo}</p>
                <CopyButton value={bankInfo} label="계좌복사" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                입금 금액
              </p>
              <p className="text-sm font-medium">
                {totalAmount.toLocaleString()}원
                {quantityValue > 1 && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({price.toLocaleString()}원 × {quantityValue}매)
                  </span>
                )}
              </p>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard/bookings" className="text-primary underline underline-offset-2">
                내 예약
              </Link>
              에서 예매 현황을 확인하실 수 있습니다.
            </>
          ) : (
            "이 페이지 하단 '비회원 예약 조회'에서 예매 현황을 확인하실 수 있습니다."
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      {isLoggedIn ? (
        <Button size="lg" className="w-full" onClick={() => setStep("form")}>
          예매하기
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button size="lg" className="flex-1" asChild>
            <a href={`/login?next=${encodeURIComponent(pathname)}`}>
              로그인
            </a>
          </Button>
          <Button size="lg" className="flex-1" variant="outline" onClick={() => setStep("form")}>
            비회원 예매
          </Button>
        </div>
      )}

      <Dialog open={step === "form"} onOpenChange={(open) => { if (!open) setStep("idle"); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isFree ? "참가 신청" : "예매하기"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              {!isLoggedIn && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  예매 후에는 입력하신{" "}
                  <span className="font-medium text-foreground">
                    이메일과 비밀번호
                  </span>
                  로만 예약을 조회할 수 있어요. 정확히 입력하고 꼭 기억해 주세요.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="홍길동"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="name@example.com"
                  autoComplete="email"
                  readOnly={isLoggedIn && !!userEmail}
                  className={isLoggedIn && userEmail ? "bg-muted cursor-not-allowed" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {!isLoggedIn && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    비밀번호 *{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      (예약 조회 시 사용)
                    </span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="4자 이상"
                    autoComplete="new-password"
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="quantity">
                  매수 *{" "}
                  {maxQuantity < 20 && (
                    <span className="text-muted-foreground font-normal text-xs">
                      (잔여석 기준 최대 {maxQuantity}매)
                    </span>
                  )}
                </Label>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? 1)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="quantity" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxQuantity }, (_, i) => i + 1).map(
                          (n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}매
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {!isFree && (
                  <p className="text-xs text-muted-foreground">
                    총 입금액{" "}
                    <span className="font-medium text-foreground">
                      {totalAmount.toLocaleString()}원
                    </span>
                    {quantityValue > 1 &&
                      ` (${price.toLocaleString()}원 × ${quantityValue}매)`}
                  </p>
                )}
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              {!isFree && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="depositor_name">입금자명 *</Label>
                    <Input
                      id="depositor_name"
                      {...register("depositor_name")}
                      placeholder="입금자 이름 (계좌 표시명)"
                    />
                    {errors.depositor_name && (
                      <p className="text-xs text-destructive">
                        {errors.depositor_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="deposited_at">입금 예상 시간 *</Label>
                    <Controller
                      control={control}
                      name="deposited_at"
                      render={({ field }) => (
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="입금 예상 날짜·시간 선택"
                        />
                      )}
                    />
                    {errors.deposited_at && (
                      <p className="text-xs text-destructive">
                        {errors.deposited_at.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {customFields.length > 0 && (
              <>
                <Separator />
                <CustomFieldRenderer
                  fields={customFields}
                  control={control}
                  errors={errors}
                />
              </>
            )}

            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("idle")}
                disabled={isPending}
                className="flex-1"
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isFree ? "참가 신청" : "예매 신청"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 중복 예매 → 추가 예약 확인 */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>이미 예매한 내역이 있습니다</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              이 이메일로 예매한 내역이 이미 있어요. 추가 예약을 하시겠어요?
              추가 예약은 기존 예약과 별도의 예약으로 생성됩니다.
            </p>
            <p className="text-xs text-muted-foreground">
              이름과 추가 질문 답변은{" "}
              <span className="font-medium text-foreground">
                기존 예약 정보로 자동 입력
              </span>
              되며, 입금자명·입금 예상 시간만 이번에 입력한 값이 적용돼요.
            </p>
            {!isLoggedIn && (
              <p className="text-xs text-muted-foreground">
                본인 확인을 위해 기존 예약과{" "}
                <span className="font-medium text-foreground">
                  같은 비밀번호
                </span>
                를 입력했을 때만 추가 예약이 가능해요.
              </p>
            )}
          </div>

          {modalError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {modalError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDuplicateOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={isPending || !pendingValues}
              onClick={() => {
                if (pendingValues) submitBooking(pendingValues, true);
              }}
            >
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              추가 예약하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 비회원 최종 확인 (네이티브 confirm 대체) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>입력 내용을 확인해 주세요</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            비회원 예매는 제출 후 정보를{" "}
            <span className="font-medium text-foreground">수정할 수 없어요.</span>{" "}
            입력하신 내용이 정확한지 확인한 뒤 진행해 주세요.
          </p>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              다시 확인
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={isPending || !confirmValues}
              onClick={() => {
                setConfirmOpen(false);
                if (confirmValues) submitBooking(confirmValues, false);
              }}
            >
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isFree ? "참가 신청" : "예매 진행"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
