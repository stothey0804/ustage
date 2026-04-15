import Link from "next/link";
import { redirect } from "next/navigation";
import { KakaoAuthButton } from "@/components/auth/KakaoAuthButton";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">공연자 회원가입</h1>
          <p className="text-sm text-muted-foreground">
            카카오 계정으로 시작하세요. 별도 가입 절차가 없습니다.
          </p>
        </header>

        <KakaoAuthButton mode="signup" />

        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
