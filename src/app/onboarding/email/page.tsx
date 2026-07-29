import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";
import { getAccountEmail, isEmailPendingVerification } from "@/lib/account-email";
import { EmailSetupForm } from "@/components/auth/EmailSetupForm";

export const metadata: Metadata = {
  title: "이메일 등록",
  robots: { index: false, follow: false },
};

interface Props {
  /** mode=change — 이미 이메일이 있는 계정이 주소를 바꾸려고 직접 들어온 경우 */
  searchParams: Promise<{ next?: string; mode?: string }>;
}

export default async function EmailOnboardingPage({ searchParams }: Props) {
  const { next, mode } = await searchParams;
  const safeNext = safeInternalPath(next);
  const isChange = mode === "change";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding/email")}`);
  }

  // 계정 이메일이 확정된 사용자는 이 화면이 필요 없다.
  // 단 '변경'으로 직접 들어온 경우는 통과시킨다 — 카카오가 이메일을 주는 계정도
  // 주소를 바꿀 수 있어야 한다(예전에는 여기서 되돌려보내 변경이 불가능했다).
  if (user.email && !isChange) redirect(safeNext);

  // 변경 중이면 Supabase가 들고 있는 new_email이 곧 '인증 대기 중인 새 주소'다.
  const pendingEmail = isChange
    ? ((user as { new_email?: string | null }).new_email ?? null)
    : isEmailPendingVerification(user)
      ? getAccountEmail(user)
      : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isChange ? "이메일 변경" : "사용할 이메일을 알려주세요"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isChange ? (
              <>
                예매 확인 메일·입장 QR·비밀번호 재설정이 모두 이 주소로 갑니다.
                새 주소로 보낸 인증 링크를 눌러야 변경이 완료돼요.
              </>
            ) : (
              <>
                카카오 로그인은 이메일을 전달하지 않아요. 예매 확인 메일과 입장
                QR을 받을 주소를 등록해 주세요.
              </>
            )}
          </p>
        </header>

        <EmailSetupForm
          next={safeNext}
          pendingEmail={pendingEmail}
          mode={isChange ? "change" : "setup"}
          currentEmail={user.email ?? null}
        />
      </div>
    </main>
  );
}
