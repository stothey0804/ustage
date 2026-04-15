"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

interface Props {
  mode: Mode;
  /** OAuth 성공 후 돌아갈 경로. 기본 /admin */
  next?: string;
}

const LABEL: Record<Mode, string> = {
  signin: "카카오로 로그인",
  signup: "카카오로 시작하기",
};

export function KakaoAuthButton({ mode, next = "/admin" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    });
    if (error) {
      console.error("[auth] kakao oauth error", error);
      setError("카카오 인증을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
    // 성공 시 Supabase가 Kakao 인증 페이지로 redirect하므로 이후 코드는 실행되지 않음.
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={loading}
        className="bg-[#FEE500] text-black hover:bg-[#FEE500]/90 disabled:opacity-70"
      >
        {loading ? "이동 중…" : LABEL[mode]}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
