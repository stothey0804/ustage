import { contactHref } from "@/lib/contact";
import { cn } from "@/lib/utils";

/** 주최자 연락처 — 오픈카톡 URL·전화번호·이메일이면 링크로, 아니면 텍스트로 보여준다 */
export function ContactLink({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const href = contactHref(value);
  if (!href) return <span className={className}>{value}</span>;

  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "break-all text-primary underline underline-offset-2",
        className
      )}
    >
      {value}
    </a>
  );
}
