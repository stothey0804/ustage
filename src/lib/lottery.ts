/**
 * 현장 추첨 로직 (순수 함수 — 난수원은 주입한다).
 *
 * 추첨 단위는 **입장 티켓 1장 = 사람 1명**이다.
 *  - 예매번호가 인원 단위(`booking_tickets.attendee_no`)로 부여되므로 같은 예매의
 *    동반자도 자기 번호로 뽑힐 수 있다. 2매 예매면 두 사람 몫의 응모가 있는 셈이다.
 *  - 입장은 티켓 단위로 기록되므로 **체크인된 티켓 = 실제로 현장에 있는 사람**이다.
 *    2매 중 1매만 입장했다면 입장한 그 1장만 후보가 된다.
 *  - 같은 예매의 티켓 두 장이 각각 당첨될 수 있다. 이름·이메일은 예매자 것뿐이라
 *    화면에서는 **번호로 구분**한다(동반자 이름을 받지 않는다).
 */

export type DrawCandidateRow = {
  id: string;
  booking_no: number;
  name: string;
  email: string | null;
  status: string;
  booking_tickets?:
    | {
        id: string;
        ticket_number: number;
        attendee_no: number | null;
        checked_in: boolean;
      }[]
    | null;
};

export type DrawCandidate = {
  ticketId: string;
  attendeeNo: number;
  bookingId: string;
  name: string;
  email: string;
};

/**
 * 추첨 후보 산출 — 취소되지 않은 예매의 **입장 완료 티켓** + (옵션) 이전 당첨 티켓 제외.
 * 인원 번호 오름차순으로 정렬해 결과 순서가 재현 가능하게 한다.
 * `attendee_no`가 없으면(마이그레이션 미적용) 첫 번호 + ticket_number - 1로 폴백한다.
 */
export function selectDrawCandidates(
  rows: readonly DrawCandidateRow[],
  excludeTicketIds: ReadonlySet<string> = new Set()
): DrawCandidate[] {
  const candidates: DrawCandidate[] = [];

  for (const row of rows) {
    if (row.status === "cancelled") continue;
    for (const ticket of row.booking_tickets ?? []) {
      if (!ticket.checked_in) continue;
      if (excludeTicketIds.has(ticket.id)) continue;
      candidates.push({
        ticketId: ticket.id,
        attendeeNo:
          ticket.attendee_no ?? row.booking_no + ticket.ticket_number - 1,
        bookingId: row.id,
        name: row.name,
        email: row.email ?? "",
      });
    }
  }

  return candidates.sort((a, b) => a.attendeeNo - b.attendeeNo);
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
