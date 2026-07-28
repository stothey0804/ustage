"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  /** 로그인 성공 후 이동할 내부 경로 */
  next?: string;
  label?: string;
}

/**
 * 카카오 OAuth 로그인 (Supabase provider).
 *
 * 카카오는 비즈앱 심사를 통과하지 않으면 이메일을 내려주지 않으므로,
 * 콜백에서 계정 이메일이 비어 있으면 /onboarding/email로 보내 주소를 받는다.
 */
export function KakaoLoginButton({
  next = "/dashboard",
  label = "카카오로 계속하기",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", safeInternalPath(next));

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: callback.toString() },
    });

    if (oauthError) {
      console.error("[auth] kakao oauth error", oauthError);
      setError("카카오 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
      return;
    }
    // 성공 시 카카오 인증 페이지로 이동하므로 로딩 상태를 유지한다.
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        onClick={start}
        disabled={loading}
        className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FADA0A] focus-visible:ring-[#FEE500]/60"
      >
        <KakaoIcon className="size-4" />
        {loading ? "카카오로 이동 중…" : label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3C6.9 3 2.75 6.31 2.75 10.39c0 2.6 1.72 4.88 4.31 6.18-.14.5-.75 2.67-.79 2.85-.05.24.09.24.19.17.08-.05 2.72-1.85 3.28-2.24.74.11 1.5.17 2.26.17 5.1 0 9.25-3.31 9.25-7.39C21.25 6.31 17.1 3 12 3Z" />
    </svg>
  );
}
