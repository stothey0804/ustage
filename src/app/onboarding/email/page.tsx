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
  searchParams: Promise<{ next?: string }>;
}

export default async function EmailOnboardingPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = safeInternalPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding/email")}`);
  }

  // 계정 이메일이 확정된 사용자는 이 화면이 필요 없다.
  // 이 화면은 **최초 등록 전용**이다 — 가입에 쓴 주소는 바꿀 수 없다(정책).
  if (user.email) redirect(safeNext);

  const pendingEmail = isEmailPendingVerification(user)
    ? getAccountEmail(user)
    : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            사용할 이메일을 알려주세요
          </h1>
          <p className="text-sm text-muted-foreground">
            카카오 로그인은 이메일을 전달하지 않아요. 예매 확인 메일과 입장 QR을
            받을 주소를 등록해 주세요. 등록한 뒤에는 변경할 수 없으니 확인해
            주세요.
          </p>
        </header>

        <EmailSetupForm next={safeNext} pendingEmail={pendingEmail} />
      </div>
    </main>
  );
}
