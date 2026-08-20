/**
 * 공개 예매 페이지의 공유 미리보기(OG/트위터 카드) 값 계산 — 순수 함수.
 *
 * 규칙이 미묘해서 테스트로 못 박는다:
 *  - 포스터가 있으면 그 이미지를 미리보기로 쓴다(서비스 로고보다 공연 포스터가 낫다).
 *  - 포스터가 없으면 `images`를 **넘기지 않는다** — 빈 배열을 주면 루트
 *    `opengraph-image.tsx`(브랜드 마크 + us.tage) 상속이 끊긴다.
 *  - 포스터는 세로라 큰 카드에서 잘리므로 트위터 카드는 정사각 썸네일을 쓴다.
 */
export type ShareEvent = {
  title: string;
  event_date: string;
  venue: string;
  poster_url: string | null;
};

export type ShareMeta = {
  title: string;
  description: string;
  /** 포스터가 없으면 undefined — 루트 OG 이미지를 물려받게 한다 */
  imageUrl?: string;
  twitterCard: "summary" | "summary_large_image";
};

export function bookingShareMeta(
  event: ShareEvent,
  /** 일시 포맷터 주입 — 표시 형식은 lib/date.ts의 formatKST 하나만 쓴다 */
  formatDate: (iso: string) => string
): ShareMeta {
  const poster = event.poster_url?.trim() || null;
  return {
    title: event.title,
    // 리치텍스트(description)는 태그가 섞여 미리보기에 부적합 — 일시·장소를 쓴다
    description: `${formatDate(event.event_date)} · ${event.venue}`,
    ...(poster ? { imageUrl: poster } : {}),
    twitterCard: poster ? "summary" : "summary_large_image",
  };
}
