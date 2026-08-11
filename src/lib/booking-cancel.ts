/**
 * 참석자 셀프 취소 가능 여부 — API와 화면이 **이 함수 하나만** 본다.
 * (주최자 취소는 별개다. 주최자는 환불 처리 후 confirmed 예약도 취소할 수 있다.)
 */
export type SelfCancelInput = {
  status: string;
  /**
   * 스테이지 가격. 0원이면 입금 개념이 없어(제출 즉시 confirmed) 확정 상태여도
   * 직접 취소할 수 있다 — 좌석을 돌려받는 쪽이 서로에게 낫다.
   */
  price: number;
  /** 티켓 한 장이라도 입장 처리됐는지 */
  checkedIn: boolean;
  /** 스테이지 종료 시각 (`event_end_date ?? event_date`) */
  eventEnd: Date | null;
  now?: Date;
};

/**
 * 셀프 취소를 막아야 하는 이유(사용자에게 그대로 보여줄 한국어). 취소 가능하면 null.
 *
 * **입금이 확인된 유료 예약은 직접 취소할 수 없다.** 환불은 주최자가 계좌로 직접
 * 처리해야 하는데, 참석자가 스스로 취소해 버리면 명단에서 사라져 환불 대상을 놓친다.
 */
export function selfCancelBlockReason(input: SelfCancelInput): string | null {
  if (input.status === "cancelled") {
    return "이미 취소된 예약입니다.";
  }

  if (input.checkedIn) {
    return "이미 입장 처리된 예약은 직접 취소할 수 없습니다. 주최자에게 문의해 주세요.";
  }

  if (input.status === "confirmed" && input.price > 0) {
    return "입금이 확인된 예약은 직접 취소할 수 없습니다. 취소·환불은 주최자에게 문의해 주세요.";
  }

  if (input.status !== "pending" && input.status !== "confirmed") {
    return "취소할 수 없는 예약입니다. 주최자에게 문의해 주세요.";
  }

  const end = input.eventEnd;
  if (end && !isNaN(end.getTime()) && end < (input.now ?? new Date())) {
    return "이미 종료된 스테이지의 예약은 직접 취소할 수 없습니다. 주최자에게 문의해 주세요.";
  }

  return null;
}

/** 셀프 취소 버튼을 보여줄지 — 이유가 없으면 가능. */
export function canSelfCancel(input: SelfCancelInput): boolean {
  return selfCancelBlockReason(input) === null;
}
