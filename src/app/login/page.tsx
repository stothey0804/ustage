import Link from "next/link";
import { redirect } from "next/navigation";
import { KakaoAuthButton } from "@/components/auth/KakaoAuthButton";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next && next.startsWith("/") ? next : "/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">공연자 로그인</h1>
          <p className="text-sm text-muted-foreground">
            카카오 계정으로 로그인하면 내 공연을 관리할 수 있어요.
          </p>
        </header>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <KakaoAuthButton mode="signin" next={next ?? "/admin"} />

        <p className="text-center text-sm text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium underline underline-offset-4">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
