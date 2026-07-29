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

/**
 * 검색어가 예매번호(`#12`, `12`) 또는 구형 BK 코드와 매칭되는지.
 *
 * 번호가 있는데 검색어가 순수 숫자면 **번호만** 대조한다 — uuid 파생 코드에도
 * 숫자가 섞여 있어(`BK-3B2411`) 폴백까지 태우면 "4" 같은 질의가 오탐이 된다.
 */
export function matchesBookingNo(
  no: number | null | undefined,
  id: string,
  query: string
): boolean {
  const q = query.trim().replace(/^#/, "");
  const numeric = q !== "" && /^\d+$/.test(q);

  if (no != null && numeric) return String(no).includes(q);
  return matchesBookingCode(id, query);
}

/**
 * 인원 단위 예매번호의 범위 표기.
 * `bookings.booking_no`는 그 예매의 **첫 인원 번호**이고, 매수만큼 연속 번호를 갖는다.
 *   (2, 1) → "#2"      (2, 2) → "#2–3"
 * 번호가 없으면(마이그레이션 미적용) uuid 파생 코드로 폴백한다.
 */
export function formatBookingNoRange(
  no: number | null | undefined,
  quantity: number,
  id: string
): string {
  if (no == null) return bookingCode(id);
  const count = Math.max(Math.floor(quantity) || 1, 1);
  return count > 1 ? `#${no}–${no + count - 1}` : `#${no}`;
}

/** 범위 안의 어느 번호로도 검색되게 한다 (`#3`, `3`, 부분 숫자, 구형 BK- 포함) */
export function matchesBookingNoRange(
  no: number | null | undefined,
  quantity: number,
  id: string,
  query: string
): boolean {
  const q = query.trim().replace(/^#/, "");
  const numeric = q !== "" && /^\d+$/.test(q);

  if (no != null && numeric) {
    const count = Math.max(Math.floor(quantity) || 1, 1);
    for (let i = 0; i < count; i += 1) {
      if (String(no + i).includes(q)) return true;
    }
    return false;
  }
  return matchesBookingCode(id, query);
}
