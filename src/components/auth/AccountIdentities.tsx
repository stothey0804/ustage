"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { Link2, Mail, Unlink } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일 + 비밀번호",
  kakao: "카카오",
};

interface Props {
  /** 서버(getUser)에서 내려받은 연결된 로그인 수단 */
  identities: UserIdentity[];
}

/**
 * 계정에 연결된 로그인 수단 표시 + 해제.
 *
 * 연결(linkIdentity)은 제공하지 않는다 — Supabase의 카카오 provider를 거쳐야 하는데
 * gotrue가 이메일·프로필 동의항목을 강제로 요청해 카카오가 인가를 거절한다
 * (그래서 로그인 자체를 OIDC 직연동으로 처리한다. lib/kakao.ts 참고).
 * 즉 카카오로 만든 계정과 이메일로 가입한 계정은 서로 별개다.
 */
export function AccountIdentities({ identities }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unlink(identity: UserIdentity) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setBusy(false);

    if (error) {
      console.error("[auth] unlinkIdentity", error);
      toast.error("연결 해제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    toast.success(
      `${PROVIDER_LABEL[identity.provider] ?? identity.provider} 연결을 해제했습니다.`,
    );
    router.refresh();
  }

  // 마지막 남은 수단을 해제하면 로그인할 방법이 사라진다.
  const canUnlink = identities.length > 1;

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border">
        {identities.map((identity) => (
          <li
            key={identity.identity_id}
            className="flex items-center justify-between gap-3 px-3.5 py-3"
          >
            <div className="flex items-center gap-2.5 text-sm">
              {identity.provider === "kakao" ? (
                <Link2 className="size-4 text-muted-foreground" />
              ) : (
                <Mail className="size-4 text-muted-foreground" />
              )}
              <span>
                {PROVIDER_LABEL[identity.provider] ?? identity.provider}
              </span>
            </div>
            {canUnlink && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={busy}
                onClick={() => unlink(identity)}
              >
                <Unlink className="size-3.5" />
                연결 해제
              </Button>
            )}
          </li>
        ))}
        {identities.length === 0 && (
          <li className="px-3.5 py-3 text-sm text-muted-foreground">
            연결된 로그인 수단을 확인할 수 없습니다.
          </li>
        )}
      </ul>

      <p className="text-xs text-muted-foreground leading-relaxed">
        카카오로 로그인한 계정과 이메일로 가입한 계정은 서로 다른 계정입니다. 스테이지와
        예매 내역은 계정별로 보이니, 한 가지 방법을 정해 계속 사용해 주세요.
      </p>
    </div>
  );
}
