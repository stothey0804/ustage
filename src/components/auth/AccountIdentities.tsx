"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { Link2, Loader2, Mail, Unlink } from "lucide-react";
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
 * 계정에 연결된 로그인 수단 관리.
 *
 * 카카오는 이메일을 주지 않아 자동 연결(같은 이메일 계정에 identity 병합)이
 * 일어나지 않는다. 그래서 기존 이메일 계정으로 로그인한 상태에서
 * linkIdentity({ provider: "kakao" })로 직접 연결한다.
 * Supabase 프로젝트에서 **Manual linking**이 켜져 있어야 동작한다.
 */
export function AccountIdentities({ identities }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function linkKakao() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/account`,
      },
    });

    if (error) {
      console.error("[auth] linkIdentity", error);
      toast.error(
        error.code === "manual_linking_disabled"
          ? "카카오 연결 기능이 꺼져 있습니다. Supabase 설정에서 Manual linking을 켜주세요."
          : "카카오 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setBusy(false);
      return;
    }
    // 성공 시 카카오 인증 페이지로 이동 — 로딩 상태 유지
  }

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

  const kakao = identities.find((i) => i.provider === "kakao");
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

      {!kakao && (
        <Button
          type="button"
          onClick={linkKakao}
          disabled={busy}
          className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FADA0A] focus-visible:ring-[#FEE500]/60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          이 계정에 카카오 연결하기
        </Button>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        카카오를 연결하면 다음부터는 카카오 버튼만 눌러 이 계정으로 로그인할 수
        있어요. 이메일과 예매 내역은 그대로 유지됩니다.
      </p>
    </div>
  );
}
