"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@/lib/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";
import { AdditionalPurchase } from "@/components/booking/AdditionalPurchase";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { selfCancelBlockReason } from "@/lib/booking-cancel";
import { effectiveQuantity } from "@/lib/seats";
import { formatBookingNoRange } from "@/lib/booking-code";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { RichTextView } from "@/components/RichTextView";
import { CopyButton } from "@/components/ui/copy-button";

interface Props {
  eventId: string;
  isFree?: boolean;
}

type LookupTicket = {
  qr_token: string;
  ticket_number: number;
  checked_in: boolean;
  attendee_no: number | null;
  /** 부분 취소된 티켓 — QR이 무효다 */
  cancelled_at?: string | null;
};

type LookupResult = {
  id: string;
  name: string;
  status: string;
  quantity: number;
  /** 인원(티켓) 번호의 첫 값 — 회원 예약 상세와 같은 형식으로 표기한다 */
  booking_no?: number | null;
  /** 부분 취소된 매수 — 유효 매수는 quantity - cancelled_quantity */
  cancelled_quantity?: number | null;
  depositor_name: string;
  deposited_at: string;
  created_at: string | null;
  tickets: LookupTicket[];
  events: {
    title: string;
    event_date: string;
    event_end_date: string | null;
    venue: string;
    bank_info: string;
    slug: string;
    contact: string;
    price: number;
    /** 서버에서 sanitize된 취소·환불 규정 HTML */
    cancel_policy_html: string | null;
    /** 잔여석 (정원 없으면 null) — 추가 구매 매수 상한에 쓴다 */
    remaining_seats: number | null;
  };
};

/** 직접 취소를 막는 이유 — 서버(API)와 같은 함수로 판정한다. 가능하면 null. */
function cancelBlockReason(result: LookupResult): string | null {
  return selfCancelBlockReason({
    status: result.status,
    price: result.events.price,
    checkedIn: result.tickets.some((t) => t.checked_in),
    eventEnd: new Date(result.events.event_end_date ?? result.events.event_date),
  });
}

const lookupFormSchema = z.object({
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

type LookupFormValues = z.infer<typeof lookupFormSchema>;

type LookupState = "idle" | "loading" | "found" | "notFound" | "error";

export function BookingLookup({ eventId, isFree = false }: Props) {
  const [state, setState] = useState<LookupState>("idle");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 조회에 성공한 자격증명 — 추가 구매·재조회에 사용
  const [credentials, setCredentials] = useState<LookupFormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
  });

  const runLookup = async (values: LookupFormValues) => {
    setState("loading");

    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          email: values.email,
          password: values.password,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { bookings: LookupResult[] };
        setResults(data.bookings);
        setCredentials(values);
        setState("found");
      } else if (res.status === 404) {
        setResults([]);
        setState("notFound");
      } else {
        // rate limit(429) 등 — 서버 메시지를 그대로 안내
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErrorMessage(json?.error ?? "조회 중 오류가 발생했습니다.");
        setState("error");
      }
    } catch {
      setErrorMessage("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setState("error");
    }
  };

  const eventInfo = results[0]?.events;

  return (
    <div className="space-y-6">
      {/* 조회 폼 */}
      <form onSubmit={handleSubmit(runLookup)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="예매 시 입력한 이메일"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="예매 시 설정한 비밀번호"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={state === "loading"}>
          {state === "loading" ? "조회 중..." : "예약 조회"}
        </Button>
      </form>

      {/* 조회 오류 (rate limit 등) */}
      {state === "error" && errorMessage && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {errorMessage}
        </div>
      )}

      {/* 예약 없음 */}
      {state === "notFound" && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground space-y-1">
          <p>예약 정보를 찾을 수 없습니다. 이메일과 비밀번호를 확인해 주세요.</p>
          <p className="text-xs">
            비밀번호를 잊으셨다면 스테이지 주최자에게 초기화를 요청할 수 있어요.
          </p>
        </div>
      )}

      {/* 결과 */}
      {state === "found" && results.length > 0 && eventInfo && (
        <div className="space-y-4">
          <Separator />

          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/e/${eventInfo.slug}`}
              className="text-sm font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {eventInfo.title}
            </Link>
            {credentials && eventInfo.remaining_seats !== 0 && (
              <AdditionalPurchase
                eventId={eventId}
                price={eventInfo.price}
                email={credentials.email}
                password={credentials.password}
                maxQuantity={eventInfo.remaining_seats ?? 20}
                remainingSeats={eventInfo.remaining_seats}
                onSuccess={() => runLookup(credentials)}
              />
            )}
          </div>

          {results.map((result, index) => (
            <BookingResultCard
              key={result.id}
              result={result}
              isFree={isFree}
              label={results.length > 1 ? `예약 ${results.length - index}` : undefined}
              credentials={credentials ?? undefined}
              onCancelled={() => {
                if (credentials) runLookup(credentials);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingResultCard({
  result,
  isFree,
  label,
  credentials,
  onCancelled,
}: {
  result: LookupResult;
  isFree: boolean;
  label?: string;
  credentials?: LookupFormValues;
  onCancelled?: () => void;
}) {
  const status = result.status;
  const policyHtml = result.events.cancel_policy_html ?? undefined;
  const blockReason = cancelBlockReason(result);
  // 부분 취소분을 뺀 유효 매수 (lib/seats.ts와 같은 계산)
  const cancelledQuantity = result.cancelled_quantity ?? 0;
  const effective = effectiveQuantity(result);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* 헤더 구성은 회원 예약 상세(dashboard/bookings/[id])와 통일한다 —
          왼쪽에 이름, 오른쪽에 상태 배지 + 매수, 그 아래 예매번호를 primary로 강조 */}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium">
          {label && (
            <span className="text-muted-foreground text-xs mr-2">{label}</span>
          )}
          {result.name}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <BookingStatusBadge status={status} isFree={isFree} />
            {effective > 1 && <Badge variant="outline">{effective}매</Badge>}
            {cancelledQuantity > 0 && (
              <Badge
                variant="outline"
                className="text-rose-600 dark:text-rose-400"
              >
                {cancelledQuantity}매 취소
              </Badge>
            )}
          </div>
          {/* 번호 범위는 구매 매수 기준(부분 취소 정책) */}
          <span className="font-mono text-[13px] font-medium text-primary">
            {formatBookingNoRange(
              result.booking_no ?? null,
              result.quantity,
              result.id
            )}
          </span>
        </div>
      </div>

      {!isFree && (
        <div className="grid gap-2 text-sm">
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">
              입금자명
            </span>
            <span>{result.depositor_name}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">
              입금예상시간
            </span>
            <span>{result.deposited_at}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-20 shrink-0">
              입금 금액
            </span>
            <span>
              {(result.events.price * effective).toLocaleString()}원
              {effective > 1 &&
                ` (${result.events.price.toLocaleString()}원 × ${effective}매)`}
            </span>
          </div>
        </div>
      )}

      {/* 입금대기 안내 */}
      {status === "pending" && result.events.contact && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          입금 확인은 아래 연락처로 문의해 주세요:{" "}
          <span className="font-medium text-foreground">
            {result.events.contact}
          </span>
        </p>
      )}

      {/* 취소 안내 */}
      {status === "cancelled" && result.events.contact && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          환불 등 문의는 주최자에게 연락해 주세요: {result.events.contact}
        </p>
      )}

      {/* 입금 계좌 */}
      {!isFree && (status === "pending" || status === "confirmed") && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">입금 계좌</p>
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
            <p className="text-sm text-muted-foreground flex-1">
              {result.events.bank_info}
            </p>
            <CopyButton value={result.events.bank_info} label="계좌복사" />
          </div>
        </div>
      )}

      {/* QR 코드 */}
      {status === "confirmed" && result.tickets.length > 0 && (
        <QRTicket name={result.name} tickets={result.tickets} />
      )}

      {/* 취소·환불 규정 */}
      {policyHtml && status !== "cancelled" && (
        <details className="rounded-md border bg-muted/40 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold">
            취소·환불 규정
          </summary>
          <RichTextView
            html={policyHtml}
            className="mt-2 text-xs text-muted-foreground"
          />
        </details>
      )}

      {/* 본인 취소 — 막힌 경우에는 버튼만 감추지 않고 이유와 다음 행동을 알려준다 */}
      {blockReason === null ? (
        <div className="flex justify-end">
          <CancelBooking
            bookingId={result.id}
            cancelPolicyHtml={policyHtml}
            contact={result.events.contact}
            credentials={credentials}
            onCancelled={onCancelled}
          />
        </div>
      ) : (
        status !== "cancelled" && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {blockReason}
            {result.events.contact ? ` (연락처: ${result.events.contact})` : ""}
          </p>
        )
      )}
    </div>
  );
}
