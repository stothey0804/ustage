import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            비밀번호 재설정
          </h1>
          <p className="text-sm text-muted-foreground">
            새로 사용할 비밀번호를 입력해 주세요.
          </p>
        </header>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
