import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "이메일 인증 완료",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

/**
 * 가입 인증 완료 안내. `/auth/callback`이 `type=signup` 검증에 성공하면 여기로 보낸다.
 *
 * 곧바로 대시보드로 보내지 않는 이유: 링크를 네이버·카카오 메일 앱의 인앱브라우저에서
 * 열면 세션이 **그 브라우저에만** 생긴다. 안내 없이 넘기면 원래(PC) 브라우저로 돌아간
 * 사용자는 인증이 끝난 줄 모르고 다시 가입을 시도해 "이미 가입된 이메일입니다"를 만난다.
 */
export default async function VerifiedPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = safeInternalPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/?next=${encodeURIComponent(safeNext)}`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <CheckCircle2 className="size-10 text-primary" strokeWidth={1.5} />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            이메일 인증이 완료됐어요
          </h1>
          <p className="text-sm text-muted-foreground">
            {user
              ? "가입이 끝났습니다. 지금 이 브라우저에서 바로 이용할 수 있어요."
              : "가입이 끝났습니다. 로그인해 주세요."}
          </p>
        </div>

        {user ? (
          <Button asChild className="w-full">
            <Link href={safeNext}>계속하기</Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={loginHref}>로그인하기</Link>
          </Button>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          PC에서 가입하고 휴대폰에서 인증하셨나요? PC 브라우저로 돌아가 로그인하면
          거기서도 이용할 수 있어요.
        </p>
      </div>
    </main>
  );
}
