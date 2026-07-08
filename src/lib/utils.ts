import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
