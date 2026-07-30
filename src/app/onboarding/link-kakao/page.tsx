import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";
import { LinkKakaoStep } from "@/components/auth/LinkKakaoStep";

export const metadata: Metadata = {
  title: "카카오 연결",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

/**
 * 카카오로 시작했지만 그 주소로 가입된 계정이 없어 이메일 가입을 마친 사람에게,
 * **처음 시도했던 카카오를 계정에 붙여주는** 단계. 가입 확인 메일의 링크가
 * /auth/callback을 거쳐 이 경로로 들어온다.
 */
export default async function LinkKakaoPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = safeInternalPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/onboarding/link-kakao?next=${safeNext}`)}`
    );
  }

  // 이미 연결됐으면(두 번 들어온 경우) 그냥 목적지로 보낸다.
  if ((user.identities ?? []).some((i) => i.provider === "kakao")) {
    redirect(safeNext);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            카카오를 연결할까요?
          </h1>
          <p className="text-sm text-muted-foreground">
            이메일 인증이 끝났어요. 처음 시도한 카카오를 이 계정에 연결하면 다음부터
            카카오 버튼만 눌러 로그인할 수 있어요.
          </p>
        </header>

        <LinkKakaoStep next={safeNext} />
      </div>
    </main>
  );
}
