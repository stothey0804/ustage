import { cn } from "@/lib/utils";

/**
 * 어스테이지 타이틀 로고(워드마크) — "us.tage".
 * us + stage 를 잇는 가운뎃점을 무대 스포트라이트처럼 살린 소문자 워드마크.
 * 색은 브랜드 primary(teal)를 그대로 사용한다 — 점은 bg-current 로 글자색을 상속.
 * 크기는 className 의 font-size(text-lg 등)에 맞춰 em 단위로 자동 스케일된다.
 * 장식 SVG 성격이므로 role="img" + aria-label 로 접근성 이름을 제공한다.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="어스테이지"
      className={cn(
        "font-bold lowercase tracking-tight text-primary",
        className,
      )}
    >
      <span aria-hidden="true">us</span>
      <span
        aria-hidden="true"
        className="mx-[0.05em] inline-block size-[0.22em] rounded-full bg-current align-baseline"
      />
      <span aria-hidden="true">tage</span>
    </span>
  );
}
