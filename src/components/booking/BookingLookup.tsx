"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRTicket } from "@/components/booking/QRTicket";

interface Props {
  eventId: string;
}

type LookupResult = {
  id: string;
  name: string;
  status: string;
  qr_token: string | null;
  depositor_name: string;
  deposited_at: string;
  checked_in: boolean | null;
  events: {
    title: string;
    event_date: string;
    venue: string;
    bank_info: string;
    slug: string;
  };
};

const BOOKING_STATUS_MAP = {
  pending: { label: "입금대기", variant: "secondary" },
  confirmed: { label: "입금완료", variant: "default" },
  cancelled: { label: "취소", variant: "outline" },
} as const;

const lookupFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

type LookupFormValues = z.infer<typeof lookupFormSchema>;

type LookupState = "idle" | "loading" | "found" | "notFound";

export function BookingLookup({ eventId }: Props) {
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
          name: values.name,
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

  const status = result?.status as keyof typeof BOOKING_STATUS_MAP | undefined;
  const statusInfo = status
    ? BOOKING_STATUS_MAP[status] ?? BOOKING_STATUS_MAP.pending
    : null;

  return (
    <div className="space-y-6">
      {/* 조회 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            placeholder="예매 시 입력한 이름"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
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
      {state === "found" && result && statusInfo && (
        <div className="space-y-4">
          <Separator />

          <div className="flex items-center justify-between">
            <p className="font-medium">{result.name}</p>
            <Badge
              variant={
                statusInfo.variant as "secondary" | "default" | "outline"
              }
            >
              {statusInfo.label}
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
              <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                {result.events.bank_info}
              </p>
            </div>
          )}

          {/* 입장 완료 */}
          {result.checked_in && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <span>입장 완료</span>
            </div>
          )}

          {/* QR 코드 */}
          {result.status === "confirmed" && result.qr_token && (
            <QRTicket qrToken={result.qr_token} name={result.name} />
          )}
        </div>
      )}
    </div>
  );
}
