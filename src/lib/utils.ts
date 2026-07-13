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
