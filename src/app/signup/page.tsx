import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "회원가입",
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams;
  // 예매 링크에서 온 사람이 가입 후 원래 가려던 곳으로 돌아가게 한다
  // (로그인 화면과 같은 동작 — 예전에는 회원가입에서만 next가 버려졌다)
  const safeNext = safeInternalPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
          <p className="text-sm text-muted-foreground">
            이메일과 비밀번호로 가입하세요.
          </p>
        </header>

        <KakaoLoginButton next={safeNext} label="카카오로 시작하기" />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">또는 이메일로 가입</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <SignupForm next={safeNext} />

        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link
            href={
              safeNext === "/dashboard"
                ? "/login"
                : `/login?next=${encodeURIComponent(safeNext)}`
            }
            className="font-medium underline underline-offset-4"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
