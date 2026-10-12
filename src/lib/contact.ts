/**
 * 주최자 연락처(`events.contact`)를 링크로 바꾼다 — 오픈카톡 URL 또는 전화번호가 대부분이다.
 * 자유 입력이라 "오픈카톡: https://…"처럼 앞뒤에 글이 붙거나 스킴 없이
 * `open.kakao.com/o/…`만 적는 경우도 있어, 문자열 안에서 처음 나오는 것을 찾는다.
 * 링크를 만들 수 없으면 null(텍스트 그대로 표시).
 */
export function contactHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();

  const url = text.match(/https?:\/\/[^\s<>"']+/i);
  if (url) return url[0];

  const bare = text.match(
    /(?:^|\s)((?:open\.kakao\.com|pf\.kakao\.com|qr\.kakaopay\.com)\/[^\s<>"']+)/i
  );
  if (bare) return `https://${bare[1]}`;

  const email = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  if (email) return `mailto:${email[0]}`;

  // 전화번호 — 숫자 9~12자리(하이픈·공백·괄호 허용, +82 국가번호 포함)
  const phone = text.match(/\+?\d[\d\-() ]{7,}\d/);
  if (phone) {
    const digits = phone[0].replace(/[^+\d]/g, "");
    const count = digits.replace("+", "").length;
    if (count >= 9 && count <= 13) return `tel:${digits}`;
  }
  return null;
}
