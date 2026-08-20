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
  /** from=kakao — 카카오로 로그인했지만 그 주소로 가입된 계정이 없어 넘어온 경우 */
  searchParams: Promise<{ next?: string; email?: string; from?: string }>;
}

/** 자동완성에 쓸 이메일만 통과시킨다(쿼리로 임의 문자열이 들어올 수 있으므로) */
function safeEmail(value: string | undefined): string {
  if (!value) return "";
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export default async function SignupPage({ searchParams }: Props) {
  const { next, email, from } = await searchParams;
  const prefillEmail = safeEmail(email);
  const fromKakao = from === "kakao";
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

        {fromKakao ? (
          /* 한 줄 = 상황, 한 줄 = 다음 행동. 주소를 바꿀 수 있다는 안내는
             실제로 바꾸는 곳(이메일 입력칸 아래)에 둔다. */
          <div className="space-y-1 rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">
              {prefillEmail
                ? `${prefillEmail}으로 가입된 계정이 없어요.`
                : /* 메일이 발송됐다는 뜻으로 읽히지 않게 — 카카오가 '주소'를 안 준 상황이다
                     (이메일 제공 동의 거부 또는 비즈앱 심사 전) */
                  "카카오가 이메일 주소를 제공하지 않아 직접 입력이 필요해요."}
            </p>
            <p>가입을 마치면 카카오가 자동으로 연결돼요.</p>
            {/* 이미 다른 메일로 가입한 사람이 이 화면에서 재가입하면 계정이 둘로
                갈라진다(기존 예매·스테이지는 원래 계정에 남는다) — 로그인으로 돌려보낸다 */}
            <p className="border-t border-amber-300/40 pt-1.5 dark:border-amber-700/40">
              이미 다른 이메일로 가입하셨나요?{" "}
              <Link
                href={`/?next=${encodeURIComponent(safeNext)}`}
                className="font-medium underline underline-offset-2"
              >
                그 계정으로 로그인
              </Link>
              한 뒤 계정 설정에서 카카오를 연결하세요.
            </p>
          </div>
        ) : (
          <>
            <KakaoLoginButton next={safeNext} label="카카오로 시작하기" />

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                또는 이메일로 가입
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {/* 카카오에서 왔다면 인증 후 카카오 연결 단계를 거쳐 목적지로 보낸다 */}
        <SignupForm
          next={
            fromKakao
              ? `/onboarding/link-kakao?next=${encodeURIComponent(safeNext)}`
              : safeNext
          }
          defaultEmail={prefillEmail}
          fromKakao={fromKakao}
        />

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
