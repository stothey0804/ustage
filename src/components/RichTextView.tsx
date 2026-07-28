import { cn } from "@/lib/utils";

/**
 * CKEditor로 작성된 HTML을 표시하는 공통 뷰.
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
      className={cn(
        "text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_em]:italic",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
