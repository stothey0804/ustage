/**
 * 참석자에게 보여줄 장소 문구 — 주최자가 입력한 `venue`가 원본이다.
 * 주소 검색으로 `venue_address`가 채워져도 `venue`에는 건물명·층·호수처럼 주최자가
 * 덧붙인 내용이 있으므로, 예전처럼 주소로 대체하면 그 부분이 잘려 보인다.
 * 주소가 `venue`에 이미 들어 있지 않을 때만 뒤에 덧붙인다.
 */
export function venueLabel(
  venue: string,
  address?: string | null
): string {
  const name = venue.trim();
  const addr = address?.trim();
  if (!addr || name.includes(addr)) return name || addr || "";
  if (!name) return addr;
  return `${name} (${addr})`;
}

/** `venue`에 이미 포함되지 않은 주소만 돌려준다 — 화면에서 주소를 따로 한 줄 띄울 때 */
export function extraAddress(
  venue: string,
  address?: string | null
): string | null {
  const addr = address?.trim();
  if (!addr || venue.includes(addr)) return null;
  return addr;
}
