"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";
import { AdditionalPurchase } from "@/components/booking/AdditionalPurchase";
import { CopyButton } from "@/components/ui/copy-button";

interface Props {
  eventId: string;
  isFree?: boolean;
}

type LookupTicket = {
  qr_token: string;
  ticket_number: number;
  checked_in: boolean;
};

type LookupResult = {
  id: string;
  name: string;
  status: string;
  quantity: number;
  depositor_name: string;
  deposited_at: string;
  created_at: string | null;
  tickets: LookupTicket[];
  events: {
    title: string;
    event_date: string;
    venue: string;
    bank_info: string;
    slug: string;
    contact: string;
    price: number;
  };
};

function getStatusLabel(status: string, isFree: boolean) {
  if (status === "confirmed") return isFree ? "참가확정" : "입금완료";
  if (status === "cancelled") return "취소";
  return "입금대기";
}

function getStatusVariant(status: string) {
  if (status === "confirmed") return "default";
  if (status === "cancelled") return "outline";
  return "secondary";
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
            {credentials && (
              <AdditionalPurchase
                eventId={eventId}
                price={eventInfo.price}
                email={credentials.email}
                password={credentials.password}
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
}: {
  result: LookupResult;
  isFree: boolean;
  label?: string;
}) {
  const status = result.status;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {label && (
            <span className="text-muted-foreground text-xs mr-2">{label}</span>
          )}
          {result.name}
          {result.quantity > 1 && (
            <span className="text-muted-foreground ml-1">
              ({result.quantity}매)
            </span>
          )}
        </p>
        <Badge
          variant={
            getStatusVariant(status) as "secondary" | "default" | "outline"
          }
        >
          {getStatusLabel(status, isFree)}
        </Badge>
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
              {(result.events.price * result.quantity).toLocaleString()}원
              {result.quantity > 1 &&
                ` (${result.events.price.toLocaleString()}원 × ${result.quantity}매)`}
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
    </div>
  );
}
