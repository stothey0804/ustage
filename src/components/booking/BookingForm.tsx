"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2 } from "lucide-react";

import {
  bookingFormSchema,
  type BookingFormValues,
} from "@/lib/validations/booking";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  isOpen: boolean;
  closedReason?: string;
}

type Step = "idle" | "form" | "success";

export function BookingForm({
  eventId,
  price,
  bankInfo,
  customFields,
  isLoggedIn,
  isOpen,
  closedReason,
}: BookingFormProps) {
  const isFree = price === 0;
  const [step, setStep] = useState<Step>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      email: "",
      depositor_name: "",
      deposited_at: "",
      quantity: 1,
      password: "",
      custom_answers: {},
    },
  });

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
        setError("deposited_at", { message: "입금 시간을 입력해 주세요." });
        return;
      }
    }

    if (!isLoggedIn) {
      const confirmed = window.confirm(
        "비회원 예매는 제출 후 정보를 수정할 수 없습니다. 입력 내용이 정확한지 확인해 주세요.\n\n예매를 진행하시겠습니까?"
      );
      if (!confirmed) return;
    }

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
          deposited_at: values.deposited_at,
          quantity: values.quantity,
          password: values.password || undefined,
          custom_answers:
            Object.keys(values.custom_answers ?? {}).length > 0
              ? values.custom_answers
              : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "예매 처리 중 오류가 발생했습니다.");
        return;
      }

      setStep("success");
    });
  };

  // 예매 불가 상태
  if (!isOpen) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {closedReason ?? "현재 예매를 받지 않습니다."}
        </p>
      </div>
    );
  }

  // 예매 완료
  if (step === "success") {
    return (
      <div className="rounded-lg border p-6 space-y-4">
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
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {isLoggedIn ? (
            <>
              <a href="/dashboard/bookings" className="text-primary underline underline-offset-2">
                내 예약
              </a>
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
            <a href={`/login?next=${encodeURIComponent(window.location.pathname)}`}>
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
                <Label htmlFor="quantity">매수 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={10}
                  {...register("quantity", { valueAsNumber: true })}
                />
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
                    <Label htmlFor="deposited_at">
                      입금 시간 *{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        (예: 오늘 오후 3시)
                      </span>
                    </Label>
                    <Input
                      id="deposited_at"
                      {...register("deposited_at")}
                      placeholder="예: 오늘 오후 3시 / 내일 오전 11시"
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
    </>
  );
}
