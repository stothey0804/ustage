/**
 * 좌석 계산 — **좌석을 차지하는 기준은 "취소되지 않은 모든 예매"** 다.
 * 입금대기(pending)도 좌석을 점유하고, 입금 확인은 확정(QR 발급)만 좌우한다.
 *
 * 예매 차단(RPC·API)과 화면 표시가 다른 기준을 쓰면 "공개 페이지는 매진인데 주최자
 * 화면은 자리가 남은 것처럼" 보이므로, 세는 곳은 모두 이 함수를 지난다.
 */
export type SeatCountable = {
  status: string | null;
  quantity: number | null;
  /** 부분 취소된 매수 — 조회에서 컬럼을 빼면 0으로 본다(좌석을 과소 계산하지 않도록) */
  cancelled_quantity?: number | null;
};

/**
 * 이 예매가 실제로 차지하는 매수 = 구매 매수 − 부분 취소 매수.
 * `quantity`는 구매 이력값으로 불변이므로 좌석은 항상 이 값으로 센다.
 */
export function effectiveQuantity(booking: SeatCountable): number {
  const bought = booking.quantity ?? 1;
  const cancelled = booking.cancelled_quantity ?? 0;
  return Math.max(bought - cancelled, 0);
}

/** 취소를 제외한 점유 좌석 (pending + confirmed, 부분 취소분 제외) */
export function occupiedSeats(bookings: readonly SeatCountable[]): number {
  return bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + effectiveQuantity(b), 0);
}

/** 입금이 확인된(확정) 좌석 — 금액 정산·확정 표시용 */
export function confirmedSeats(bookings: readonly SeatCountable[]): number {
  return bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + effectiveQuantity(b), 0);
}

/** 입금대기 좌석 = 점유 - 확정 */
export function pendingSeats(bookings: readonly SeatCountable[]): number {
  return occupiedSeats(bookings) - confirmedSeats(bookings);
}

/** 남은 좌석. 정원이 없으면 null(무제한). 음수는 0으로 잘라 표시에 쓰기 안전하게 한다. */
export function remainingSeats(
  bookings: readonly SeatCountable[],
  capacity: number | null | undefined
): number | null {
  if (!capacity || capacity <= 0) return null;
  return Math.max(capacity - occupiedSeats(bookings), 0);
}

/** 점유율(%) — 정원이 없으면 null */
export function occupancyPercent(
  bookings: readonly SeatCountable[],
  capacity: number | null | undefined
): number | null {
  if (!capacity || capacity <= 0) return null;
  return Math.min(Math.round((occupiedSeats(bookings) / capacity) * 100), 100);
}
