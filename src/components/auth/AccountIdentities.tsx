"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { Link2, Loader2, Mail, Unlink } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { KAKAO_SCOPES } from "@/lib/kakao";
import { Button } from "@/components/ui/button";

const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일 + 비밀번호",
  kakao: "카카오",
};

/**
 * 연결 실패 원인을 사용자가 조치할 수 있는 문구로 바꾼다.
 * 원인 파악이 중요한 화면이라 알 수 없는 오류는 code/message를 그대로 덧붙인다.
 */
function describeLinkError(error: {
  code?: string;
  status?: number;
  message?: string;
}): string {
  if (error.code === "manual_linking_disabled") {
    return "카카오 연결 기능이 꺼져 있습니다. Supabase 설정에서 Manual linking을 켜주세요.";
  }
  if (error.code === "identity_already_exists") {
    return "이 카카오 계정은 이미 다른 어스테이지 계정에 연결돼 있어요. 그 계정으로 로그인하거나, 먼저 해당 계정에서 연결을 해제해 주세요.";
  }
  const detail = error.code ?? (error.status ? `HTTP ${error.status}` : null);
  return `카카오 연결에 실패했습니다${detail ? ` (${detail})` : ""}. ${error.message ?? ""}`.trim();
}

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
        scopes: KAKAO_SCOPES,
      },
    });

    if (error) {
      console.error("[auth] linkIdentity", error);
      toast.error(describeLinkError(error), { duration: 10000 });
      setBusy(false);
      return;
    }
    // 성공 시 카카오 인증 페이지로 이동 — 로딩 상태 유지
  }

  async function unlink(identity: UserIdentity) {
    // 이메일은 예매 안내·비밀번호 재설정·스태프 초대의 기준 주소다.
    // 끊으면 계정을 되찾을 방법이 사라지므로 UI와 함수 양쪽에서 막는다.
    if (identity.provider === "email") {
      toast.error("이메일은 연결을 해제할 수 없어요. 주소를 바꾸려면 이메일 변경을 이용해 주세요.");
      return;
    }
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
  const hasOtherMethod = identities.length > 1;

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
            {identity.provider === "email" ? (
              <span className="text-[11px] leading-snug text-muted-foreground">
                안내 메일·비밀번호 재설정에 쓰여요
              </span>
            ) : (
              hasOtherMethod && (
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
              )
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
        있어요. 연결을 해제해도 이메일과 예매 내역은 끊기지 않고 그대로 남습니다.
      </p>
    </div>
  );
}
