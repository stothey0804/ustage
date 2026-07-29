/**
 * 현장 추첨 로직 (순수 함수 — 난수원은 주입한다).
 *
 * 추첨 단위는 **예매(booking) 1건**이다:
 *  - 당첨자 식별에 쓰는 값(예매번호·이름·이메일)이 모두 예매 단위 속성이다.
 *    티켓 단위로 뽑으면 같은 사람의 티켓 2장이 각각 당첨될 수 있고, 결과 화면에서
 *    둘을 구분할 방법이 없다(티켓에는 개인 식별자가 없다).
 *  - 다매수 구매자에게 가중치를 주자는 요구는 없다.
 *  - 2매 중 1매만 입장한 예매는 **후보에 포함**한다 — 그 사람은 현장에 와 있다.
 */

export type DrawCandidateRow = {
  id: string;
  booking_no: number;
  name: string;
  email: string | null;
  status: string;
  booking_tickets?: { checked_in: boolean }[] | null;
};

export type DrawCandidate = {
  bookingId: string;
  bookingNo: number;
  name: string;
  email: string;
};

/**
 * 추첨 후보 산출 — 취소 제외 + 티켓 1장 이상 입장 완료 + (옵션) 이전 당첨자 제외.
 * 예매번호 오름차순으로 정렬해 결과가 재현 가능한 순서를 갖게 한다.
 */
export function selectDrawCandidates(
  rows: readonly DrawCandidateRow[],
  excludeBookingIds: ReadonlySet<string> = new Set()
): DrawCandidate[] {
  return rows
    .filter((row) => {
      if (row.status === "cancelled") return false;
      if (excludeBookingIds.has(row.id)) return false;
      return (row.booking_tickets ?? []).some((t) => t.checked_in);
    })
    .sort((a, b) => a.booking_no - b.booking_no)
    .map((row) => ({
      bookingId: row.id,
      bookingNo: row.booking_no,
      name: row.name,
      email: row.email ?? "",
    }));
}

/**
 * 비복원 추첨. `random(max)`는 [0, max) 정수를 돌려주는 함수(프로덕션은 crypto.randomInt).
 * 부분 Fisher–Yates로 앞에서 count개만 확정한다.
 * count가 후보 수 이상이면 전원을 (섞인 순서로) 반환한다.
 */
export function drawWinners<T>(
  candidates: readonly T[],
  count: number,
  random: (maxExclusive: number) => number
): T[] {
  const pool = [...candidates];
  const take = Math.min(Math.max(Math.floor(count), 0), pool.length);

  for (let i = 0; i < take; i += 1) {
    const j = i + random(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, take);
}
