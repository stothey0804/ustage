import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: true },
};

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
    redirect(safeInternalPath(next));
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
          <p className="text-sm text-muted-foreground">
            이메일과 비밀번호로 로그인하세요.
          </p>
        </header>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <LoginForm next={safeInternalPath(next)} />

        <div className="flex flex-col gap-3 text-center text-sm text-muted-foreground">
          <p>
            <Link
              href="/forgot-password"
              className="font-medium underline underline-offset-4"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </p>
          <p>
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium underline underline-offset-4">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
