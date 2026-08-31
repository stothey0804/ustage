import { cn } from "@/lib/utils";

export const SUPPORT_EMAIL = "support@privateustage.com";

/**
 * 외부에 공개되는 화면(홈·가이드) 하단의 문의 주소 + 운영 주체 표기.
 * 참석자가 주최자에게 연락할 때는 `events.contact`를 쓴다 — 이 주소는 서비스 자체 문의용이다.
 */
export function FooterMeta({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-1 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <p>
        문의{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p>© 2026 stoylab</p>
    </div>
  );
}
