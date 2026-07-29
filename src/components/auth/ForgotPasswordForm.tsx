"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";

import { requestPasswordReset } from "@/app/actions/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    // 가입 여부 확인·발송은 서버에서 한다 (미가입 주소에 "보냈다"고 하지 않기 위해).
    const result = await requestPasswordReset(values.email);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/30 p-6 text-center">
        <MailCheck className="size-8 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">재설정 메일을 보냈어요</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {getValues("email")}
            </span>
            로 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해
            주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "발송 중…" : "재설정 메일 보내기"}
      </Button>
    </form>
  );
}
