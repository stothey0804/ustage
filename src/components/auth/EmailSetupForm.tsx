"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { emailSetupSchema, type EmailSetupValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  /** 인증 메일 링크 및 "계속하기"에서 이동할 내부 경로 */
  next: string;
  /** 이미 주소를 등록했고 인증 링크 클릭만 남은 경우의 주소 */
  pendingEmail: string | null;
}

/**
 * 카카오 등 이메일 없는 계정의 이메일 등록.
 *
 * updateUser({ email })은 **새 주소로 인증 메일을 보내고**, 링크를 클릭할 때까지
 * 계정 이메일(auth.users.email)은 비어 있다. 그래서 같은 주소를
 * user_metadata.contact_email에도 복사해 인증 전에도 앱이 동작하게 한다.
 */
export function EmailSetupForm({ next, pendingEmail }: Props) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(pendingEmail);
  const [editing, setEditing] = useState(!pendingEmail);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // 입력한 주소가 이미 가입된 계정인 경우 — 카카오 연결로 안내한다.
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailSetupValues>({
    resolver: zodResolver(emailSetupSchema),
    defaultValues: { email: pendingEmail ?? "" },
  });

  function isEmailTaken(code: string | undefined, message: string): boolean {
    if (code === "email_exists") return true;
    return /already been registered|already registered|already exists/i.test(
      message,
    );
  }

  function describeError(code: string | undefined, message: string): string {
    if (isEmailTaken(code, message)) {
      return "이미 사용 중인 이메일입니다. 다른 주소를 입력하거나 해당 계정에 카카오를 연결해 주세요.";
    }
    if (code === "over_email_send_rate_limit") {
      return "메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return "이메일 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  /** 이미 그 주소로 가입된 계정이 있을 때 — 로그아웃하고 이메일 로그인으로 보낸다. */
  async function switchToExistingAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  async function onSubmit(values: EmailSetupValues) {
    setServerError(null);
    setResent(false);
    setConflictEmail(null);
    const email = values.email.trim().toLowerCase();
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser(
      { email, data: { contact_email: email } },
      {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    );

    if (error) {
      console.error("[auth] email setup error", error);
      if (isEmailTaken(error.code, error.message)) {
        setConflictEmail(email);
        return;
      }
      setServerError(describeError(error.code, error.message));
      return;
    }

    setSentTo(email);
    setEditing(false);
  }

  async function resend() {
    if (!sentTo || resending) return;
    setResending(true);
    setServerError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "email_change",
      email: sentTo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      console.error("[auth] email change resend error", error);
      setServerError(describeError(error.code, error.message));
      setResending(false);
      return;
    }

    setResent(true);
    setResending(false);
  }

  if (sentTo && !editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 rounded-lg border p-5 text-center">
          <MailCheck className="size-6 text-primary" />
          <p className="text-sm">
            <span className="font-medium">{sentTo}</span>
            으로 인증 메일을 보냈습니다.
          </p>
          <p className="text-xs text-muted-foreground">
            메일함(스팸함 포함)에서 링크를 눌러 인증을 완료해 주세요. 인증 전에도
            이 주소로 예매 메일이 발송됩니다.
          </p>
        </div>

        {resent ? (
          <p className="text-center text-xs text-muted-foreground">
            인증 메일을 다시 보냈습니다.
          </p>
        ) : null}

        {serverError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {serverError}
          </p>
        ) : null}

        <Button type="button" size="lg" onClick={() => router.replace(next)}>
          계속하기
        </Button>

        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={resend}
            disabled={resending}
          >
            {resending ? "발송 중…" : "인증 메일 재발송"}
          </button>
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              setEditing(true);
              setResent(false);
              setServerError(null);
            }}
          >
            주소 변경
          </button>
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

      {conflictEmail ? (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>
            <span className="font-medium">{conflictEmail}</span>로 가입된 계정이
            이미 있어요.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            다른 주소를 입력하거나, 그 계정으로 이메일 로그인해서 기존 스테이지·예매
            내역을 이어서 쓰실 수 있어요. 카카오 계정과 이메일 계정은 서로 다른
            계정이라 한쪽을 정해 사용해 주세요.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={switchToExistingAccount}
          >
            기존 계정으로 이메일 로그인하기
          </Button>
        </div>
      ) : null}

      {serverError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "등록 중…" : "이메일 등록하고 계속하기"}
      </Button>

      {sentTo ? (
        <button
          type="button"
          className="text-center text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => setEditing(false)}
        >
          돌아가기
        </button>
      ) : null}
    </form>
  );
}
