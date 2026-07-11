import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Open redirect 방지: 앱 내부 절대경로만 허용한다.
 * 외부 URL(`https://evil.com`), 프로토콜 상대 경로(`//evil.com`),
 * 그리고 브라우저가 `/`로 정규화하는 백슬래시 우회(`/\evil.com`)를 모두 fallback으로 대체.
 */
export function safeInternalPath(
  next: string | undefined | null,
  fallback = "/dashboard",
): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  // 두 번째 문자가 슬래시/백슬래시면 `//host` 형태로 외부 이동 가능 → 차단
  if (next.length > 1 && (next[1] === "/" || next[1] === "\\")) return fallback;
  return next;
}

/**
 * 계좌 정보 문자열의 예금주명 마스킹.
 * "카카오뱅크 3333-12-345678 김철주" → "카카오뱅크 3333-12-345678 김*주"
 * bank_info는 자유 형식이라 마지막 공백 토큰이 한글 이름(2~4자)일 때만 마스킹.
 */
export function maskBankInfo(bankInfo: string): string {
  const parts = bankInfo.trim().split(/\s+/);
  if (parts.length < 2) return bankInfo;
  const last = parts[parts.length - 1];
  if (!/^[가-힣]{2,4}$/.test(last)) return bankInfo;
  parts[parts.length - 1] =
    last.length === 2
      ? `${last[0]}*`
      : `${last[0]}${"*".repeat(last.length - 2)}${last[last.length - 1]}`;
  return parts.join(" ");
}
