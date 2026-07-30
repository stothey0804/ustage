import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAccountEmail, isEmailPendingVerification } from "@/lib/account-email";
import { AccountIdentities } from "@/components/auth/AccountIdentities";
import { DeleteAccountButton } from "@/components/auth/DeleteAccountButton";
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
  // 변경 요청은 했지만 아직 확정되지 않은 새 주소.
  // Supabase의 Secure email change가 켜져 있으면 기존·새 주소 양쪽 링크를 모두
  // 눌러야 완료되는데, 이걸 표시하지 않으면 "변경이 씹혔다"고 오해하게 된다.
  const pendingChange =
    (user as { new_email?: string | null }).new_email ?? null;

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
          {/* 등록만 가능하다 — 가입에 쓴 주소는 바꿀 수 없다(정책) */}
          {!accountEmail && (
            <Button asChild variant="outline" size="sm">
              <Link href="/onboarding/email?next=/dashboard/account">
                이메일 등록
              </Link>
            </Button>
          )}
          {!pending && accountEmail && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/forgot-password">비밀번호 재설정</Link>
            </Button>
          )}
        </div>
        {accountEmail && !pendingChange && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            가입에 사용한 주소는 변경할 수 없습니다. 예매 확인 메일·입장 QR·비밀번호
            재설정이 모두 이 주소를 기준으로 발송돼요.
          </p>
        )}
        {pendingChange && (
          <div className="space-y-1.5 rounded-md border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-950/30">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              {pendingChange}로 변경 대기 중
            </p>
            <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              이전에 요청한 변경이 남아 있어요.{" "}
              <span className="font-medium">{pendingChange}</span>로 보낸 인증 메일의
              링크를 눌러야 변경이 완료됩니다. 보안 설정에 따라{" "}
              {accountEmail ? (
                <>
                  기존 주소(<span className="font-medium">{accountEmail}</span>)로도
                </>
              ) : (
                <>기존 주소로도</>
              )}{" "}
              확인 메일이 갔다면 <span className="font-medium">양쪽 링크를 모두</span>{" "}
              눌러야 해요. 완료 전까지는 기존 주소로 메일이 발송됩니다.
            </p>
          </div>
        )}
        {pending && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            인증을 마치면 이 주소로 비밀번호 재설정 메일도 받을 수 있어요. 인증
            전에도 예매 메일은 이 주소로 발송됩니다.
          </p>
        )}
      </section>

      <Separator />

      {/* 로그인 수단 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">로그인 수단</h2>
        <AccountIdentities identities={user.identities ?? []} />
      </section>

      <Separator />

      {/* 회원 탈퇴 — 되돌릴 수 없으므로 항상 최하단에 둔다 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-destructive">회원 탈퇴</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          계정을 삭제하면 되돌릴 수 없습니다. 예매가 없는 스테이지는 함께 삭제되고,
          예매 내역이 있는 스테이지가 남아 있으면 탈퇴할 수 없습니다.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
