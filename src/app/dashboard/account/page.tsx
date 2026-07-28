import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountEmail, isEmailPendingVerification } from "@/lib/account-email";
import { AccountIdentities } from "@/components/auth/AccountIdentities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "계정 설정",
  robots: { index: false, follow: false },
};

interface Props {
  /** 카카오 연결 실패 시 /auth/callback이 붙여 보내는 원인 메시지 */
  searchParams: Promise<{ error?: string }>;
}

export default async function AccountPage({ searchParams }: Props) {
  const { error: linkError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/account");

  const accountEmail = getAccountEmail(user);
  const pending = isEmailPendingVerification(user);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          대시보드
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">계정 설정</h1>
      </div>

      {linkError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {linkError}
        </p>
      ) : null}

      {/* 이메일 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">이메일</h2>
        {accountEmail ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{accountEmail}</span>
            {pending ? (
              <Badge variant="outline" className="text-[10px]">
                인증 대기
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                인증 완료
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 이메일이 없습니다. 예매 확인 메일을 받으려면 주소를 등록해
            주세요.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/onboarding/email?next=/dashboard/account">
              {accountEmail ? "이메일 변경" : "이메일 등록"}
            </Link>
          </Button>
          {!pending && accountEmail && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/forgot-password">비밀번호 재설정</Link>
            </Button>
          )}
        </div>
        {pending && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            인증을 마치면 이메일+비밀번호 로그인과 비밀번호 재설정도 사용할 수
            있어요. 인증 전에도 예매 메일은 이 주소로 발송됩니다.
          </p>
        )}
      </section>

      <Separator />

      {/* 로그인 수단 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">로그인 수단</h2>
        <AccountIdentities identities={user.identities ?? []} />
      </section>
    </div>
  );
}
