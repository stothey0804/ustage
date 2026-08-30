"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Minus, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createOnsiteBooking } from "@/app/actions/booking";
import { CustomFieldRenderer } from "@/components/booking/CustomFieldRenderer";
import type { CustomAnswersForm } from "@/lib/validations/booking";
import type { CustomField } from "@/lib/validations/event";
import { formatBookingNoRange } from "@/lib/booking-code";
import {
  onsiteBookingSchema,
  type OnsiteBookingValues,
} from "@/lib/validations/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  eventId: string;
  /** 온라인 예매 1매 가격 (원) */
  price: number;
  /** 현장 예매 1매 가격 — null이면 온라인 가격과 동일 */
  onsitePrice?: number | null;
  /** 남은 좌석 — 정원이 없으면 null(상한 20매). 좌석은 주최자도 초과할 수 없다 */
  remainingSeats?: number | null;
  /** 스테이지의 커스텀 필드 — 필수 항목은 현장 예매에서도 받아야 한다 */
  customFields?: CustomField[];
}

type Created = {
  bookingId: string;
  bookingNo: number | null;
  generatedPassword: string | null;
  confirmed: boolean;
  quantity: number;
  email: string;
};

/**
 * 현장 예매 — 주최자가 현장에서 비회원 예매를 대신 만든다.
 * 스테이지가 마감·종료 상태여도 생성되며(서버 액션이 상태를 검사하지 않는다),
 * 좌석 정원과 중복 이메일만 막는다.
 */
export function OnsiteBookingDialog({
  eventId,
  price,
  onsitePrice = null,
  remainingSeats = null,
  customFields = [],
}: Props) {
  // 현장 예매는 현장 가격 기준으로 금액·무료 여부를 판정한다 (서버 액션과 같은 규칙)
  const effectivePrice = onsitePrice ?? price;
  const isFree = effectivePrice === 0;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // 중복 이메일 재확인 대기 중인 입력값
  const [duplicateValues, setDuplicateValues] =
    useState<OnsiteBookingValues | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<OnsiteBookingValues>({
    resolver: zodResolver(onsiteBookingSchema),
    defaultValues: {
      name: "",
      email: "",
      quantity: 1,
      password: undefined,
      confirmNow: true,
      custom_answers: {},
    },
  });

  const quantity = watch("quantity") || 1;
  const confirmNow = watch("confirmNow");
  /**
   * 고를 수 있는 최대 매수 — 잔여석이 있으면 그 값이 상한이다.
   * 좌석은 물리적 제약이라 주최자도 초과할 수 없다(서버 RPC도 같은 검사를 한다).
   */
  const maxQuantity = Math.max(
    1,
    remainingSeats === null ? 20 : Math.min(20, remainingSeats)
  );
  const soldOut = remainingSeats === 0;

  function closeAndReset(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      // 다이얼로그를 닫을 때 초기화 — 현장에서 연속 등록하는 흐름을 방해하지 않도록
      // 성공 화면에서 '한 명 더 추가'로 이어갈 수도 있다.
      reset();
      setCreated(null);
      setServerError(null);
      setDuplicateValues(null);
      setShowPasswordField(false);
    }
  }

  function submit(values: OnsiteBookingValues, allowDuplicate = false) {
    setServerError(null);
    startTransition(async () => {
      const result = await createOnsiteBooking({
        eventId,
        name: values.name,
        email: values.email,
        quantity: values.quantity,
        password: values.password,
        confirmNow: values.confirmNow,
        customAnswers: values.custom_answers,
        allowDuplicate,
      });

      if ("error" in result) {
        if (result.code === "duplicate_email") {
          setDuplicateValues(values);
          return;
        }
        setServerError(result.error);
        return;
      }

      setDuplicateValues(null);
      setCreated({
        bookingId: result.bookingId,
        bookingNo: result.bookingNo,
        generatedPassword: result.generatedPassword,
        confirmed: isFree || values.confirmNow,
        quantity: values.quantity,
        email: values.email,
      });
      toast.success("현장 예매가 등록되었습니다.");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-3.5" />
        현장 예매 추가
      </Button>

      <Dialog open={open} onOpenChange={closeAndReset}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {created ? "현장 예매 등록 완료" : "현장 예매 추가"}
            </DialogTitle>
          </DialogHeader>

          {created ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-4xl bg-input/50 px-5 py-6 text-center">
                <span className="text-xs text-muted-foreground">예매번호</span>
                <span className="font-mono text-2xl font-bold text-primary">
                  {created.bookingNo != null
                    ? formatBookingNoRange(
                        created.bookingNo,
                        created.quantity,
                        created.bookingId
                      )
                    : "발급됨"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {created.quantity}매 ·{" "}
                  {created.confirmed
                    ? isFree
                      ? "참가확정"
                      : "입금완료"
                    : "입금대기"}
                </span>
              </div>

              {created.generatedPassword && (
                <div className="space-y-1.5 rounded-3xl border p-3.5">
                  <p className="text-13 font-semibold">
                    예약 조회 비밀번호
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold">
                      {created.generatedPassword}
                    </span>
                    <CopyButton
                      value={created.generatedPassword}
                      label="복사"
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    이 번호를 참석자에게 알려주세요. 이메일과 이 번호로 예약을
                    조회할 수 있어요. 지금 화면을 닫으면 다시 볼 수 없고, 필요하면
                    명단에서 비밀번호를 초기화해 새로 알려줘야 합니다.
                  </p>
                </div>
              )}

              <p className="text-13 leading-relaxed text-muted-foreground">
                {created.confirmed
                  ? "입장 QR이 담긴 확정 메일을 보냈습니다."
                  : "입금 안내 메일을 보냈습니다. 입금을 확인하면 명단에서 확정 처리해 주세요."}
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    reset();
                    setCreated(null);
                    setShowPasswordField(false);
                  }}
                >
                  한 명 더 추가
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => closeAndReset(false)}
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit((values) => submit(values))}
              className="space-y-4"
            >
              <p className="rounded-3xl bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                현장에서 받은 예매를 명단에 직접 추가합니다. 스테이지가 마감·종료된
                뒤에도 등록할 수 있고, 좌석 한도는 그대로 적용됩니다.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="onsite-name">이름 *</Label>
                <Input
                  id="onsite-name"
                  {...register("name")}
                  placeholder="참석자 성함"
                  autoComplete="off"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="onsite-email">이메일 *</Label>
                <Input
                  id="onsite-email"
                  type="email"
                  {...register("email")}
                  placeholder="티켓을 받을 이메일"
                  autoComplete="off"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>매수 *</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="매수 줄이기"
                    disabled={quantity <= 1}
                    onClick={() =>
                      setValue("quantity", Math.max(quantity - 1, 1))
                    }
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-5 text-center font-mono text-15">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="매수 늘리기"
                    disabled={quantity >= maxQuantity}
                    onClick={() =>
                      setValue("quantity", Math.min(quantity + 1, maxQuantity))
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                  {!isFree && (
                    <span className="ml-auto text-13 font-medium">
                      {(effectivePrice * quantity).toLocaleString()}원
                    </span>
                  )}
                </div>
                {errors.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
                {/* 현장 가격이 온라인과 다르면 헷갈리지 않게 명시한다 */}
                {onsitePrice !== null && onsitePrice !== price && (
                  <p className="text-xs text-muted-foreground">
                    현장 예매 가격 {onsitePrice.toLocaleString()}원 기준 금액이에요
                    (온라인 {price.toLocaleString()}원).
                  </p>
                )}
                {remainingSeats !== null && (
                  <p
                    className={
                      soldOut
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {soldOut
                      ? "좌석이 모두 찼어요. 좌석 한도를 늘린 뒤 등록해 주세요."
                      : `남은 좌석 ${remainingSeats}석 — 최대 ${maxQuantity}매까지 등록할 수 있어요.`}
                  </p>
                )}
              </div>

              {/* 커스텀 필드 — 필수 항목은 현장 예매에서도 받는다.
                  예전에는 이 폼에 아예 없어서 현장 예매만 답변이 빈 채로 남았다. */}
              {customFields.length > 0 && (
                <>
                  <Separator />
                  <CustomFieldRenderer
                    fields={customFields}
                    control={control as unknown as Control<CustomAnswersForm>}
                    errors={errors as FieldErrors<CustomAnswersForm>}
                  />
                </>
              )}

              {!isFree && (
                <label className="flex cursor-pointer items-center gap-2 text-13">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={confirmNow}
                    onChange={(e) => setValue("confirmNow", e.target.checked)}
                  />
                  바로 입금확인 처리 (입장 QR 메일 발송)
                </label>
              )}

              <Separator />

              {showPasswordField ? (
                <div className="space-y-1.5">
                  <Label htmlFor="onsite-password">
                    예약 조회 비밀번호{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (4자 이상)
                    </span>
                  </Label>
                  <Input
                    id="onsite-password"
                    {...register("password")}
                    placeholder="직접 지정"
                    autoComplete="off"
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => setShowPasswordField(true)}
                >
                  조회 비밀번호를 직접 정하기 (기본: 4자리 자동 생성)
                </button>
              )}

              {duplicateValues && (
                <div className="space-y-2 rounded-3xl border p-3.5 text-13">
                  <p>이미 이 이메일로 예매된 내역이 있습니다.</p>
                  <p className="text-xs text-muted-foreground">
                    같은 사람이 추가로 구매한 경우라면 별도 예매로 하나 더 만들 수
                    있어요.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => submit(duplicateValues, true)}
                  >
                    추가 예매로 등록하기
                  </Button>
                </div>
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
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => closeAndReset(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isPending || soldOut}
                >
                  {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  등록
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
