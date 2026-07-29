/**
 * 현장 추첨 결과처럼 여러 사람이 함께 보는 화면에 개인정보를 띄울 때 쓰는 마스킹.
 * 본인은 자기 것을 알아볼 수 있고, 옆사람은 특정할 수 없는 정도를 목표로 한다.
 */

/**
 * 이름 마스킹 — 가운데를 가린다.
 *   "김"       → "*"
 *   "김수"     → "김*"
 *   "김수영"   → "김*영"
 *   "남궁민수" → "남**수"
 * 빈 문자열·공백뿐이면 "?".
 */
export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  const chars = [...trimmed];
  if (chars.length === 1) return "*";
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/**
 * 이메일 마스킹 — 로컬파트 앞 4문자만 남기고 나머지는 길이를 드러내지 않는 "***"로,
 * 도메인은 그대로 둔다(같은 도메인이 많아 식별력이 낮고, 본인 확인에는 도움이 된다).
 *   "seyoung.kim@ustage.im" → "seyo***@ustage.im"
 *   "abcde@a.com"           → "abcd***@a.com"
 * 로컬파트가 4자 이하면 앞 4자를 남기는 순간 전체가 노출되므로 첫 글자만 남긴다.
 *   "abcd@a.com"            → "a***@a.com"
 *   "ab@a.com"              → "a***@a.com"
 * "@"가 없으면 전체를 로컬파트로 보고 같은 규칙을 적용한다.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (trimmed.length === 0) return "?";

  const at = trimmed.lastIndexOf("@");
  const local = at === -1 ? trimmed : trimmed.slice(0, at);
  const domain = at === -1 ? "" : trimmed.slice(at);

  const chars = [...local];
  const keep = chars.length > 4 ? 4 : 1;
  return `${chars.slice(0, keep).join("")}***${domain}`;
}
