/**
 * 추가 구매에서 이름·커스텀 답변을 **이번 입력값으로 쓸지, 기존 예약에서 상속할지** 정한다.
 *
 * 경로가 둘이라 규칙이 필요하다:
 *  - 예매 폼에서 중복 이메일이 감지돼 추가 구매로 재제출 → 사용자가 이름·답변을 **채워 보낸다.**
 *    별도 예약이므로(동반자 대리 예매 등) 그 값을 그대로 쓴다.
 *  - 예약 조회 화면의 '추가 구매' → 매수·입금 정보만 받고 이름·답변 UI가 없다.
 *    보낼 값이 없으니 기존 예약에서 상속한다.
 *
 * 규칙이 한 번 어긋나 입력값이 조용히 버려진 적이 있어(2026-08-20) 순수 함수로 분리했다.
 */
export type InheritSource<A> = {
  name: string;
  custom_answers: A | null;
} | null;

export function resolveBookingIdentity<A>(input: {
  /** 이번 제출의 이름 (조회 화면 경로는 빈 문자열) */
  submittedName: string | undefined;
  /** 이번 제출의 커스텀 답변 — 정의된 필드만 남긴 것 */
  submittedAnswers: Record<string, unknown>;
  /** 본인 확인된 기존 예약 (신규 예매는 null) */
  original: InheritSource<A>;
}): { name: string; customAnswers: A | Record<string, unknown> | null } {
  const submittedName = input.submittedName?.trim() ?? "";
  const hasAnswers = Object.keys(input.submittedAnswers).length > 0;

  return {
    name: submittedName || input.original?.name || "",
    customAnswers: hasAnswers
      ? input.submittedAnswers
      : (input.original?.custom_answers ?? null),
  };
}
