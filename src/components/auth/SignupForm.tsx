"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SEC = 30;

interface Props {
  /** 가입 확인 메일 링크에서 돌아올 내부 경로 */
  next?: string;
  /** 카카오에서 받은 주소 등 미리 채워둘 이메일 */
  defaultEmail?: string;
  /** 카카오 로그인에서 넘어온 경우 — 주소를 바꿔도 된다는 안내를 붙인다 */
  fromKakao?: boolean;
}

export function SignupForm({
  next = "/dashboard",
  defaultEmail = "",
  fromKakao = false,
}: Props) {
  const callbackUrl = (origin: string) =>
    `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const [serverError, setServerError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: defaultEmail },
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
        emailRedirectTo: callbackUrl(window.location.origin),
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
        emailRedirectTo: callbackUrl(window.location.origin),
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
          {/* 인증은 링크를 연 브라우저에서 끝난다 — 이 화면은 그것을 알 수 없다.
              안내가 없으면 휴대폰에서 인증한 사람이 여기서 다시 가입을 시도한다. */}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            인증은 <span className="font-medium text-foreground">링크를 연 브라우저</span>
            에서 완료됩니다. 휴대폰에서 인증하셨다면 이 화면에서는 로그인해 주세요.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
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
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            인증을 마쳤어요 — 로그인 화면으로
          </Link>
          {/* 메일이 끝내 오지 않는 경우(휴면 메일함·수신 차단)의 탈출구.
              미인증 계정은 데이터가 없으므로 다른 주소로 새로 가입하는 것이
              곧 주소 변경이다 — 미인증 상태의 이메일 변경 기능을 따로 만들지 않는다. */}
          <button
            type="button"
            onClick={() => {
              resetField("email");
              setResendMessage(null);
              setSentEmail(null);
            }}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            메일이 계속 오지 않나요? — 다른 이메일로 다시 가입
          </button>
        </div>
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
        ) : fromKakao ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            자주 쓰는 주소로 바꿔도 돼요. 카카오·다음 메일은 휴면 상태면 인증 메일을
            받지 못합니다.
          </p>
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
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
          {/* 이미 가입된 주소라면 다음 행동은 로그인이다 — 링크를 함께 준다
              (휴대폰에서 인증을 마친 뒤 이 화면으로 돌아온 경우가 대부분이다) */}
          {serverError.startsWith("이미 가입된 이메일") ? (
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-block text-xs font-medium text-destructive underline underline-offset-4"
            >
              로그인 화면으로 이동
            </Link>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "가입 중…" : "회원가입"}
      </Button>
    </form>
  );
}
