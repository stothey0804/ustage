/**
 * 표시용 예약번호.
 *
 * DB에는 별도 예약번호 컬럼이 없고 bookings.id(uuid)가 유일 키다. 참석자가 읽고
 * 옮겨 적을 수 있어야 해서 uuid 앞부분을 대문자 6자로 줄여 보여준다.
 * **표시 전용이다** — 조회·인증 키로 쓰지 않는다(짧아서 충돌·추측이 가능).
 * 검색은 이 형식과 원본 uuid 모두를 대조한다.
 */
export function bookingCode(id: string): string {
  const compact = id.replace(/-/g, "").toUpperCase();
  return `BK-${compact.slice(0, 6)}`;
}

/** 검색어가 예약번호(BK-XXXXXX 또는 일부)와 매칭되는지 */
export function matchesBookingCode(id: string, query: string): boolean {
  const q = query.trim().toUpperCase().replace(/^BK-?/, "");
  if (!q) return false;
  return bookingCode(id).includes(q) || id.toUpperCase().includes(q);
}

/**
 * 화면·메일에 쓰는 예매번호 표시. `bookings.booking_no`는 스테이지별 예매 순번이다.
 * 마이그레이션(20260729100000_booking_number.sql) 미적용 환경에서는 번호가 없으므로
 * 기존 uuid 파생 코드로 폴백한다.
 */
export function formatBookingNo(
  no: number | null | undefined,
  id: string
): string {
  return no != null ? `#${no}` : bookingCode(id);
}

/** 검색어가 예매번호(`#12`, `12`) 또는 구형 BK 코드와 매칭되는지 */
export function matchesBookingNo(
  no: number | null | undefined,
  id: string,
  query: string
): boolean {
  const q = query.trim().replace(/^#/, "");
  if (no != null && q !== "" && /^\d+$/.test(q) && String(no).includes(q)) {
    return true;
  }
  return matchesBookingCode(id, query);
}
