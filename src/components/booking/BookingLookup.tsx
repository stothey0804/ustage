"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";
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
  tickets: LookupTicket[];
  events: {
    title: string;
    event_date: string;
    venue: string;
    bank_info: string;
    slug: string;
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

type LookupState = "idle" | "loading" | "found" | "notFound";

export function BookingLookup({ eventId, isFree = false }: Props) {
  const [state, setState] = useState<LookupState>("idle");
  const [result, setResult] = useState<LookupResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
  });

  const onSubmit = async (values: LookupFormValues) => {
    setState("loading");
    setResult(null);

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
        const data = (await res.json()) as { booking: LookupResult };
        setResult(data.booking);
        setState("found");
      } else {
        setState("notFound");
      }
    } catch {
      setState("notFound");
    }
  };

  const status = result?.status;

  return (
    <div className="space-y-6">
      {/* 조회 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      {/* 예약 없음 */}
      {state === "notFound" && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          예약 정보를 찾을 수 없습니다. 이름과 비밀번호를 확인해 주세요.
        </div>
      )}

      {/* 결과 */}
      {state === "found" && result && status && (
        <div className="space-y-4">
          <Separator />

          <div className="flex items-center justify-between">
            <p className="font-medium">
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

          <div className="grid gap-2 text-sm">
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">
                입금자명
              </span>
              <span>{result.depositor_name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">
                입금시간
              </span>
              <span>{result.deposited_at}</span>
            </div>
          </div>

          {/* 입금 계좌 */}
          {(result.status === "pending" || result.status === "confirmed") && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">입금 계좌</p>
              <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                <p className="text-sm text-muted-foreground flex-1">{result.events.bank_info}</p>
                <CopyButton value={result.events.bank_info} label="계좌복사" />
              </div>
            </div>
          )}

          {/* QR 코드 */}
          {result.status === "confirmed" && result.tickets.length > 0 && (
            <QRTicket name={result.name} tickets={result.tickets} />
          )}
        </div>
      )}
    </div>
  );
}
