/**
 * 예매에 적용된 1매 단가 — **금액을 말하는 모든 곳이 이 함수만 본다.**
 *
 * 현장 예매 가격(`events.onsite_price`)이 생기면서 스테이지 가격 하나로는
 * "이 예매에 얼마가 적용됐는가"를 알 수 없게 됐다. 예매 시점에 `bookings.unit_price`로
 * 못 박고, 화면·CSV·메일·취소 판정이 그 값을 읽는다.
 *
 * `unit_price`가 없는 경우(마이그레이션 적용 전에 만들어진 행, 백필 누락)에는
 * 스테이지의 온라인 가격으로 되돌아간다 — 예전 동작과 같아 더 나빠지지 않는다.
 */
export type BookingPriceInput = {
  unit_price?: number | null;
};

export function bookingUnitPrice(
  booking: BookingPriceInput | null | undefined,
  eventPrice: number
): number {
  const unit = booking?.unit_price;
  return typeof unit === "number" && unit >= 0 ? unit : eventPrice;
}

/** 이 예매의 결제 금액 = 단가 × 유효 매수 */
export function bookingAmount(
  booking: BookingPriceInput | null | undefined,
  eventPrice: number,
  effectiveQuantity: number
): number {
  return bookingUnitPrice(booking, eventPrice) * effectiveQuantity;
}

/**
 * 스테이지가 "돈을 받지 않는가" — 온라인·현장 **양쪽 모두** 0원일 때만 무료다.
 *
 * 온라인 무료 + 현장 유료 스테이지를 무료로 취급하면 명단에서 입금대기 필터와
 * 입금 확인 흐름이 통째로 사라져, 현장 결제분을 확인할 방법이 없어진다.
 */
export function isFreeStage(
  price: number,
  onsitePrice: number | null | undefined
): boolean {
  return price === 0 && (onsitePrice ?? 0) === 0;
}
