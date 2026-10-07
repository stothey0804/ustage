import { cn } from "@/lib/utils";

/**
 * CKEditor로 작성된 HTML을 표시하는 공통 뷰.
 * 본문 스타일은 globals.css의 `.rich-text` — 에디터 화면과 같은 규칙이다.
 * `html`은 **반드시 서버에서 sanitizeEventHtml을 통과한 값**이어야 한다
 * (클라이언트 컴포넌트에 넘기는 경우도 마찬가지 — API 응답 단계에서 정화한다).
 */
export function RichTextView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
