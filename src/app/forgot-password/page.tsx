import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            비밀번호 찾기
          </h1>
          <p className="text-sm text-muted-foreground">
            가입한 이메일로 재설정 링크를 보내드려요.
          </p>
        </header>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium underline underline-offset-4"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
