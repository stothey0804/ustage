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
      {/* 명단 관리(데스크톱)가 넓은 폭을 쓰므로 컨테이너는 여기서 제한하지 않고
          각 페이지가 자신의 max-width를 정한다. */}
      <main className="mx-auto w-full max-w-[1520px] flex-1 px-4 py-8 md:px-10">
        {children}
      </main>
    </>
  );
}
