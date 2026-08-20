import { cn } from "@/lib/utils";
import { BRAND_MARK_SVG } from "@/lib/brand-mark";

/**
 * 어스테이지 브랜드 마크 — 무대 위 스포트라이트·마이크.
 * 벡터는 `lib/brand-mark.ts`의 단일 출처를 쓴다(OG 이미지와 같은 값).
 * 장식 용도이므로 aria-hidden — 접근성 이름은 옆의 워드마크 텍스트가 제공한다.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block leading-none", className)}
      dangerouslySetInnerHTML={{ __html: BRAND_MARK_SVG }}
    />
  );
}
