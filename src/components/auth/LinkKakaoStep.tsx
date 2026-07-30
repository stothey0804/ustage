"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { KAKAO_SCOPES } from "@/lib/kakao";
import { Button } from "@/components/ui/button";

interface Props {
  /** 연결까지 끝난 뒤 이동할 내부 경로 */
  next: string;
}

/**
 * 이메일 인증을 마친 직후 **처음 시도했던 카카오를 계정에 붙이는 단계.**
 *
 * 카카오로 로그인했지만 그 주소로 가입된 계정이 없어 이메일 가입으로 돌아온 사람은,
 * 인증만 끝내면 카카오와의 연결이 끊긴 채 남는다(가입은 됐지만 카카오 버튼으로는
 * 못 들어온다). 그래서 인증 직후 이 화면으로 보내 `linkIdentity`를 바로 시작한다.
 *
 * 연결은 카카오 동의 화면을 한 번 거쳐야 하므로 서버에서 대신 할 수 없다
 * — 브라우저 리다이렉트가 반드시 필요하다.
 */
export function LinkKakaoStep({ next }: Props) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  async function start() {
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "kakao",
      options: { redirectTo: callback.toString(), scopes: KAKAO_SCOPES },
    });

    if (linkError) {
      console.error("[auth] link kakao after signup", linkError);
      setError(
        linkError.code === "manual_linking_disabled"
          ? "카카오 연결 기능이 꺼져 있습니다. Supabase 설정에서 Manual linking을 켜주세요."
          : "카카오 연결을 시작할 수 없습니다. 아래 버튼으로 다시 시도해 주세요.",
      );
      setManual(true);
      return;
    }
    // 성공 시 카카오 동의 화면으로 이동한다.
  }

  useEffect(() => {
    // 리다이렉트는 한 번만 — StrictMode 이중 실행을 막는다.
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              카카오 동의 화면으로 이동하는 중이에요…
            </p>
          </>
        )}
      </div>

      {(manual || error) && (
        <Button
          type="button"
          size="lg"
          onClick={() => {
            setError(null);
            void start();
          }}
          className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FADA0A] focus-visible:ring-[#FEE500]/60"
        >
          카카오 연결하기
        </Button>
      )}

      <Link
        href={next}
        className="text-center text-sm text-muted-foreground underline underline-offset-4"
      >
        나중에 하기 — 계정 설정에서 연결할 수 있어요
      </Link>
    </div>
  );
}
