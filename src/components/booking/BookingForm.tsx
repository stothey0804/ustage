"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, Minus, Plus } from "lucide-react";

import {
  bookingFormSchema,
  type BookingFormValues,
  type CustomAnswersForm,
} from "@/lib/validations/booking";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import { formatDepositTime } from "@/lib/date";
import { bookingCode, formatBookingNoRange } from "@/lib/booking-code";
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
import { RichTextView } from "@/components/RichTextView";
import type { CustomField } from "@/lib/validations/event";

interface BookingFormProps {
  eventId: string;
  /** 요약 카드 표시용 */
  eventTitle: string;
  /** 요약 카드 표시용 — 이미 서식이 적용된 일시 문자열 */
  eventDateLabel: string;
  price: number;
  bankInfo: string;
  /** 신청 폼 상단 주의사항 — 서버에서 sanitize된 HTML */
  noticeHtml?: string;
  /** 취소·환불 규정 — 서버에서 sanitize된 HTML */
  cancelPolicyHtml?: string;
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
  eventTitle,
  eventDateLabel,
  price,
  bankInfo,
  noticeHtml,
  cancelPolicyHtml,
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
  // 입금자명을 예매자 이름과 동일하게 채울지 (기본 on)
  const [sameName, setSameName] = useState(true);
  // 제출 성공 후 안내에 쓰는 예약번호
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  /**
   * 서버가 알려준 잔여석 — 동시 제출로 좌석이 줄었을 때만 채워진다.
   * 모달을 닫지 않고 그 자리에서 매수를 줄일 수 있게 상한을 낮춘다.
   */
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
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
  // 서버가 잔여석을 알려주면 그 값이 상한이 된다(더 작은 쪽을 쓴다)
  const effectiveMax = Math.max(
    1,
    seatLimit === null ? maxQuantity : Math.min(maxQuantity, seatLimit)
  );
  const soldOut = seatLimit === 0;

  const setQuantity = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), effectiveMax);
    setValue("quantity", clamped, { shouldValidate: true });
  };

  const onSubmit = (values: BookingFormValues) => {
    if (!isLoggedIn && (!values.password || values.password.length < 4)) {
      setError("password", { message: "비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    if (!isFree) {
      // "예매자 이름과 동일" 체크 시 입금자명을 이름으로 채운다.
      if (sameName && values.name) {
        values.depositor_name = values.name;
      }
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

        // 동시 제출로 좌석이 줄어든 경우 — 폼을 닫지 않고 매수 상한만 낮춘다.
        // (예전에는 모달을 닫고 1단계로 돌아가 매수를 다시 고르게 했다)
        if (res.status === 409 && json.code === "capacity_exceeded") {
          const remaining = typeof json.remaining === "number" ? json.remaining : 0;
          setSeatLimit(remaining);
          if (remaining > 0 && values.quantity > remaining) {
            setValue("quantity", remaining, { shouldValidate: true });
          }
          const message = json.error ?? "잔여 좌석이 부족합니다.";
          if (additional) setModalError(message);
          else setServerError(message);
          // 최종 확인 모달이 열려 있으면 닫고, 입력 폼으로 되돌린다
          setConfirmOpen(false);
          setDuplicateOpen(false);
          setStep("form");
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
      if (typeof json?.bookingNo === "number") {
        // 인원 단위 번호 — 2매면 "#2–3"
        setCreatedCode(
          formatBookingNoRange(json.bookingNo, values.quantity, json.bookingId)
        );
      } else if (typeof json?.bookingId === "string") {
        // 예매번호 마이그레이션 미적용 환경 폴백
        setCreatedCode(bookingCode(json.bookingId));
      }
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

  // 3단계: 입금 안내 (무료는 확정 안내)
  if (step === "success") {
    return (
      <div className="space-y-5">
        <StepIndicator current={3} />

        {/* 금액 블록 */}
        <div className="flex flex-col items-center gap-3 rounded-4xl bg-input/50 px-5 py-6 text-center">
          {isFree ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <CheckCircle className="size-3.5" />
                참가확정
              </span>
              <p className="text-xl font-bold tracking-tight">참가가 확정되었습니다</p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-current" />
                입금대기
              </span>
              <p className="text-3xl font-bold tracking-tight">
                {totalAmount.toLocaleString()}원
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {quantityValue}매
            {createdCode && (
              <>
                {" · 예약번호 "}
                <span className="font-mono">{createdCode}</span>
              </>
            )}
          </p>
        </div>

        {/* 계좌 카드 */}
        {!isFree && (
          <div className="space-y-3.5 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-muted-foreground">입금 계좌</span>
              <CopyButton value={bankInfo} label="복사" />
            </div>
            <p className="font-mono text-[15px] font-medium break-all">
              {bankInfo}
            </p>
            <Separator />
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">입금 금액</span>
              <span className="font-medium">
                {totalAmount.toLocaleString()}원
                {quantityValue > 1 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({price.toLocaleString()}원 × {quantityValue}매)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* 확인 사항 */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold">확인해주세요</p>
          <ul className="space-y-1 text-[13px] leading-relaxed text-muted-foreground">
            {!isFree && (
              <>
                <li>· 입금자명이 다르면 확인이 늦어질 수 있어요.</li>
                <li>· 주최자가 입금을 확인하면 입장 QR이 담긴 확정 메일이 발송됩니다.</li>
              </>
            )}
            {isFree && (
              <li>· 입장 QR이 담긴 메일이 발송되었습니다.</li>
            )}
            <li>· 예약번호와 이메일은 예매 조회에 사용됩니다.</li>
          </ul>
        </div>

        {isLoggedIn ? (
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/dashboard/bookings">예매 내역 보기</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            이 페이지 하단 &lsquo;비회원 예약 조회&rsquo;에서 예매 현황과 입장 QR을
            확인하실 수 있습니다.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 1단계: 매수 선택 + 총액 — 별도 화면 없이 상세 하단에서 바로 고른다 */}
      <div className="space-y-3 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">매수</span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="매수 줄이기"
              disabled={quantityValue <= 1}
              onClick={() => setQuantity(quantityValue - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-5 text-center font-mono text-[15px]">
              {quantityValue}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="매수 늘리기"
              disabled={quantityValue >= effectiveMax}
              onClick={() => setQuantity(quantityValue + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {effectiveMax < 20 && (
          <p className="text-xs text-muted-foreground">
            잔여석 기준 최대 {effectiveMax}매까지 예매할 수 있어요.
          </p>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">
            {isFree ? "참가비" : "총 결제금액"}
          </span>
          <span className="text-lg font-bold">
            {isFree ? "무료" : `${totalAmount.toLocaleString()}원`}
          </span>
        </div>

        {isLoggedIn ? (
          <Button size="lg" className="w-full" onClick={() => setStep("form")}>
            {isFree ? "참가 신청하기" : "예매하기"}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button size="lg" className="flex-1" asChild>
              <a href={`/login?next=${encodeURIComponent(pathname)}`}>로그인</a>
            </Button>
            <Button
              size="lg"
              className="flex-1"
              variant="outline"
              onClick={() => setStep("form")}
            >
              비회원 예매
            </Button>
          </div>
        )}
      </div>

      <Dialog open={step === "form"} onOpenChange={(open) => { if (!open) setStep("idle"); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:content-start max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom-6 max-sm:data-closed:zoom-out-100 max-sm:data-closed:slide-out-to-bottom-6">
          <DialogHeader>
            <DialogTitle>{isFree ? "참가 신청" : "예매자 정보"}</DialogTitle>
          </DialogHeader>

          <StepIndicator current={2} />

          {/* 요약 카드 — 무엇을 몇 매 신청하는지 이 단계에서도 분명히 보이게 */}
          <div className="flex flex-col gap-1 rounded-4xl bg-primary/8 px-4 py-3.5">
            <span className="text-sm font-semibold">{eventTitle}</span>
            <span className="text-xs text-muted-foreground">{eventDateLabel}</span>
            {/* 매수는 이 단계에서도 조정할 수 있다 — 동시 제출로 좌석이 줄었을 때
                모달을 닫고 1단계로 돌아가지 않아도 되게 한다 */}
            <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-primary/15 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">예매 매수</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  aria-label="매수 줄이기"
                  disabled={isPending || quantityValue <= 1}
                  onClick={() => setQuantity(quantityValue - 1)}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="min-w-8 text-center font-mono text-[15px] font-semibold text-primary">
                  {quantityValue}매
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  aria-label="매수 늘리기"
                  disabled={isPending || quantityValue >= effectiveMax}
                  onClick={() => setQuantity(quantityValue + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              {!isFree && (
                <span className="text-[13px] font-semibold">
                  {totalAmount.toLocaleString()}원
                </span>
              )}
            </div>

            {seatLimit !== null && (
              <p
                className={
                  soldOut
                    ? "mt-1 text-xs font-medium text-destructive"
                    : "mt-1 text-xs text-muted-foreground"
                }
              >
                {soldOut
                  ? "좌석이 모두 찼어요. 예매를 진행할 수 없습니다."
                  : `방금 좌석이 줄어 최대 ${effectiveMax}매까지 예매할 수 있어요.`}
              </p>
            )}
          </div>

          {noticeHtml && (
            <div
              className="rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:mb-1"
              dangerouslySetInnerHTML={{ __html: noticeHtml }}
            />
          )}

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
                  {/* 실제로 bcrypt 해시만 저장하고 주최자 화면에도 내려보내지 않는다
                      (api/bookings/route.ts의 해시 저장 · lookup 응답에서 제외) */}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    비밀번호는 암호화되어 저장되며 주최자도 확인할 수 없어요. 예약
                    조회에만 쓰이고, 잊으면 주최자에게 초기화를 요청해야 합니다.
                  </p>
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              )}

              {!isFree && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="depositor_name">입금자명 *</Label>
                    <Input
                      id="depositor_name"
                      {...register("depositor_name")}
                      placeholder="입금하실 분의 성함"
                      disabled={sameName}
                      className={sameName ? "bg-muted" : undefined}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={sameName}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSameName(next);
                          if (next) {
                            setValue("depositor_name", watch("name") ?? "");
                          }
                        }}
                      />
                      예매자 이름과 동일합니다
                    </label>
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
                {/* 렌더러는 custom_answers만 보므로 캐스팅해 넘긴다
                    (RHF의 Control<T>는 폼 스키마마다 달라 구조적으로 호환되지 않는다) */}
                <CustomFieldRenderer
                  fields={customFields}
                  control={control as unknown as Control<CustomAnswersForm>}
                  errors={errors as FieldErrors<CustomAnswersForm>}
                />
              </>
            )}

            {cancelPolicyHtml && (
              <>
                <Separator />
                <details className="rounded-lg border bg-muted/40 px-3.5 py-3" open>
                  <summary className="cursor-pointer text-xs font-semibold">
                    취소·환불 규정
                  </summary>
                  <RichTextView
                    html={cancelPolicyHtml}
                    className="mt-2 text-xs text-muted-foreground"
                  />
                </details>
              </>
            )}

            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            {!isFree && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                다음 화면에서 계좌를 안내드립니다. 주최자가 입금을 확인하면 입장 QR이
                담긴 확정 메일이 발송됩니다.
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
                이전
              </Button>
              <Button
                type="submit"
                disabled={isPending || soldOut}
                className="flex-1"
              >
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isFree ? "참가 신청" : "입금 안내 받기"}
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
              이번에 입력한{" "}
              <span className="font-medium text-foreground">
                이름·추가 질문 답변이 그대로 저장
              </span>
              돼요. 기존 예약은 그대로 남습니다.
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

/**
 * 예매 진행 인디케이터 — 매수 선택(1) → 정보 입력(2) → 입금 안내(3).
 * 3분할 바로만 표현하고 단계 이름은 각 화면 제목이 담당한다.
 */
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5" aria-label={`${current}단계 / 3단계`}>
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={
            step <= current
              ? "h-[3px] flex-1 rounded-full bg-primary"
              : "h-[3px] flex-1 rounded-full bg-secondary"
          }
        />
      ))}
    </div>
  );
}
