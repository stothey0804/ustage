"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/utils";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  next?: string;
}

export function LoginForm({ next = "/dashboard" }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  // 이메일 미인증 계정 — 인증 메일 재발송 버튼 노출용
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    setUnconfirmedEmail(null);
    setResendState("idle");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      console.error("[auth] login error", error);
      if (
        error.code === "email_not_confirmed" ||
        error.message === "Email not confirmed"
      ) {
        setServerError(
          "이메일 인증이 완료되지 않았습니다. 가입 시 받은 인증 메일의 링크를 클릭해 주세요.",
        );
        setUnconfirmedEmail(values.email);
        return;
      }
      setServerError(
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    // 로그인 성공 — 세션 쿠키가 세팅됨. 내부 경로로만 이동(open redirect 방지).
    window.location.assign(safeInternalPath(next));
  }

  async function resendConfirmation() {
    if (!unconfirmedEmail || resendState !== "idle") return;
    setResendState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("[auth] resend error", error);
      setServerError("인증 메일 재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setResendState("idle");
      return;
    }
    setResendState("sent");
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive space-y-2">
          <p>{serverError}</p>
          {unconfirmedEmail ? (
            resendState === "sent" ? (
              <p className="text-xs text-muted-foreground">
                인증 메일을 다시 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendConfirmation}
                disabled={resendState !== "idle"}
              >
                {resendState === "sending" ? "발송 중…" : "인증 메일 재발송"}
              </Button>
            )
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
