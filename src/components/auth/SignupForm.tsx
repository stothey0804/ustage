"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SEC = 30;

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SEC);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function onSubmit(values: SignupValues) {
    setServerError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // 확인 메일 링크 클릭 시 앱의 콜백으로 복귀 → 세션 교환 후 대시보드 이동
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[auth] signup error", error);
      setServerError(
        error.message === "User already registered"
          ? "이미 가입된 이메일입니다."
          : "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    // 이메일 확인이 켜진 상태에서 이미 가입된 이메일로 signUp하면
    // Supabase는 에러 대신 identities가 빈 가짜 user를 반환한다(정보 노출 방지).
    if (data.user && data.user.identities?.length === 0) {
      setServerError("이미 가입된 이메일입니다. 로그인해 주세요.");
      return;
    }

    // 이메일 확인이 꺼져 있으면 세션이 즉시 반환됨 → 바로 이동.
    if (data.session) {
      window.location.assign("/dashboard");
      return;
    }

    // 이메일 확인이 켜져 있으면 안내 화면 표시.
    setSentEmail(values.email);
    startCooldown();
  }

  async function resend() {
    if (!sentEmail || resendCooldown > 0) return;
    setResendMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("[auth] resend error", error);
      setResendMessage("재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setResendMessage("인증 메일을 다시 보냈습니다.");
    startCooldown();
  }

  if (sentEmail) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center space-y-3">
        <div>
          <p className="font-medium">인증 메일을 발송했습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sentEmail}</span>
            으로 보낸 확인 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            메일이 보이지 않으면 스팸함을 확인해 주세요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resend}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0
            ? `인증 메일 재발송 (${resendCooldown}초)`
            : "인증 메일 재발송"}
        </Button>
        {resendMessage ? (
          <p className="text-xs text-muted-foreground">{resendMessage}</p>
        ) : null}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "가입 중…" : "회원가입"}
      </Button>
    </form>
  );
}
