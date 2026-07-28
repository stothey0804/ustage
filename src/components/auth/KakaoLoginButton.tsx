import { Button } from "@/components/ui/button";
import { safeInternalPath } from "@/lib/utils";

interface Props {
  /** 로그인 성공 후 이동할 내부 경로 */
  next?: string;
  label?: string;
}

/**
 * 카카오 로그인 시작 버튼.
 *
 * Supabase provider가 아니라 우리 라우트(/api/auth/kakao/start)로 보낸다 —
 * gotrue가 강제로 붙이는 이메일·프로필 동의항목을 피하고 scope를 openid 하나로
 * 제한하기 위해서다(lib/kakao.ts 참고). 상태 관리가 필요 없어 서버에서 렌더한다.
 */
export function KakaoLoginButton({
  next = "/dashboard",
  label = "카카오로 계속하기",
}: Props) {
  const href = `/api/auth/kakao/start?next=${encodeURIComponent(safeInternalPath(next))}`;

  return (
    <Button
      asChild
      size="lg"
      className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FADA0A] focus-visible:ring-[#FEE500]/60"
    >
      <a href={href}>
        <KakaoIcon className="size-4" />
        {label}
      </a>
    </Button>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3C6.9 3 2.75 6.31 2.75 10.39c0 2.6 1.72 4.88 4.31 6.18-.14.5-.75 2.67-.79 2.85-.05.24.09.24.19.17.08-.05 2.72-1.85 3.28-2.24.74.11 1.5.17 2.26.17 5.1 0 9.25-3.31 9.25-7.39C21.25 6.31 17.1 3 12 3Z" />
    </svg>
  );
}
