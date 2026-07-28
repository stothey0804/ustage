import { Header } from "@/components/dashboard/Header";
import { EmailVerifyBanner } from "@/components/dashboard/EmailVerifyBanner";
import { createClient } from "@/lib/supabase/server";
import { getAccountEmail, isEmailPendingVerification } from "@/lib/account-email";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 카카오 로그인 계정은 계정 이메일이 비어 있고 온보딩에서 받은 주소만 있을 수 있다.
  const accountEmail = getAccountEmail(user);
  const pendingEmail = isEmailPendingVerification(user) ? accountEmail : null;

  return (
    <>
      <Header userEmail={accountEmail ?? undefined} />
      {pendingEmail ? <EmailVerifyBanner email={pendingEmail} /> : null}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
