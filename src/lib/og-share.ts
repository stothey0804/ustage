/**
 * 공개 예매 페이지의 공유 미리보기 문구 — 순수 함수.
 *
 * 미리보기 **이미지**는 여기서 다루지 않는다: 파일 기반 메타데이터가
 * `generateMetadata`보다 우선하므로 이미지는 같은 세그먼트의
 * `app/e/[slug]/opengraph-image.tsx`가 그려야 한다(포스터 또는 브랜드 마크).
 */
export type ShareEvent = {
  title: string;
  event_date: string;
  venue: string;
};

export type ShareMeta = {
  title: string;
  description: string;
};

export function bookingShareMeta(
  event: ShareEvent,
  /** 일시 포맷터 주입 — 표시 형식은 lib/date.ts의 formatKST 하나만 쓴다 */
  formatDate: (iso: string) => string
): ShareMeta {
  return {
    title: event.title,
    // 리치텍스트(description)는 태그가 섞여 미리보기에 부적합 — 일시·장소를 쓴다
    description: `${formatDate(event.event_date)} · ${event.venue}`,
  };
}
