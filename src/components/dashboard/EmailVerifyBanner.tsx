"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  /** 인증 대기 중인 주소 (user_metadata.contact_email) */
  email: string;
}

/**
 * 카카오 로그인 후 등록한 이메일의 인증이 아직 끝나지 않았을 때의 안내.
 * 인증 전에도 앱은 이 주소로 메일을 보내지만, 이메일+비밀번호 로그인과
 * 비밀번호 재설정은 인증을 완료해야 쓸 수 있다.
 */
export function EmailVerifyBanner({ email }: Props) {
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "email_change",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setSending(false);

    if (error) {
      console.error("[auth] email change resend error", error);
      toast.error("인증 메일 재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    toast.success("인증 메일을 다시 보냈습니다.");
  }

  return (
    <div className="border-b border-amber-300/60 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
        <MailWarning className="size-4 shrink-0" />
        <p className="flex-1 leading-relaxed">
          <span className="font-medium">{email}</span> 인증이 완료되지 않았습니다.
          메일함의 링크를 눌러 인증을 마치면 이메일 로그인과 비밀번호 재설정도 쓸
          수 있어요.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={resend}
          disabled={sending}
        >
          {sending ? "발송 중…" : "인증 메일 재발송"}
        </Button>
      </div>
    </div>
  );
}
