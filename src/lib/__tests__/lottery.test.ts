import { describe, expect, it } from "vitest";
import {
  drawWinners,
  selectDrawCandidates,
  type DrawCandidateRow,
} from "@/lib/lottery";

/** 예매 1건 + 티켓들. attendee_no는 booking_no + ticket_number - 1 규칙을 따른다. */
function booking(
  id: string,
  bookingNo: number,
  tickets: { checkedIn: boolean; attendeeNo?: number | null }[],
  overrides: Partial<DrawCandidateRow> = {}
): DrawCandidateRow {
  return {
    id,
    booking_no: bookingNo,
    name: "홍길동",
    email: "hong@example.com",
    status: "confirmed",
    booking_tickets: tickets.map((t, i) => ({
      id: `${id}-t${i + 1}`,
      ticket_number: i + 1,
      attendee_no: t.attendeeNo === undefined ? bookingNo + i : t.attendeeNo,
      checked_in: t.checkedIn,
    })),
    ...overrides,
  };
}

describe("selectDrawCandidates", () => {
  it("입장 완료된 티켓만 후보가 된다 (사람 단위)", () => {
    const candidates = selectDrawCandidates([
      booking("a", 1, [{ checkedIn: true }]),
      booking("b", 2, [{ checkedIn: false }]),
      { ...booking("c", 3, []), booking_tickets: [] },
      { ...booking("d", 4, []), booking_tickets: null },
    ]);
    expect(candidates.map((c) => c.attendeeNo)).toEqual([1]);
  });

  it("2매 중 1매만 입장하면 그 1장만 후보가 된다", () => {
    const candidates = selectDrawCandidates([
      booking("a", 2, [{ checkedIn: true }, { checkedIn: false }]),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].attendeeNo).toBe(2);
  });

  it("2매 모두 입장하면 두 사람 몫으로 후보가 2개 생긴다", () => {
    const candidates = selectDrawCandidates([
      booking("a", 2, [{ checkedIn: true }, { checkedIn: true }]),
    ]);
    expect(candidates.map((c) => c.attendeeNo)).toEqual([2, 3]);
    expect(candidates.map((c) => c.ticketId)).toEqual(["a-t1", "a-t2"]);
    // 이름·이메일은 예매자 것이라 같다 — 화면에서는 번호로 구분한다
    expect(candidates[0].name).toBe(candidates[1].name);
  });

  it("취소된 예매의 티켓은 입장 기록이 있어도 제외한다", () => {
    const candidates = selectDrawCandidates([
      booking("a", 1, [{ checkedIn: true }], { status: "cancelled" }),
      booking("b", 2, [{ checkedIn: true }]),
    ]);
    expect(candidates.map((c) => c.bookingId)).toEqual(["b"]);
  });

  it("이전 당첨 티켓만 제외하고, 같은 예매의 다른 티켓은 후보로 남는다", () => {
    const candidates = selectDrawCandidates(
      [booking("a", 2, [{ checkedIn: true }, { checkedIn: true }])],
      new Set(["a-t1"])
    );
    expect(candidates.map((c) => c.attendeeNo)).toEqual([3]);
  });

  it("인원 번호 오름차순으로 정렬하고 이메일이 없으면 빈 문자열", () => {
    const candidates = selectDrawCandidates([
      booking("c", 30, [{ checkedIn: true }]),
      booking("a", 2, [{ checkedIn: true }], { email: null }),
    ]);
    expect(candidates.map((c) => c.attendeeNo)).toEqual([2, 30]);
    expect(candidates[0].email).toBe("");
  });

  it("attendee_no가 없으면(마이그레이션 미적용) 첫 번호 + ticket_number - 1로 폴백", () => {
    const candidates = selectDrawCandidates([
      booking("a", 5, [
        { checkedIn: true, attendeeNo: null },
        { checkedIn: true, attendeeNo: null },
      ]),
    ]);
    expect(candidates.map((c) => c.attendeeNo)).toEqual([5, 6]);
  });
});

describe("drawWinners", () => {
  /** 항상 첫 후보를 고르는 난수원 — 결정적 검증용 */
  const pickFirst = () => 0;

  it("주입한 난수원에 따라 결정적으로 뽑는다", () => {
    expect(drawWinners(["a", "b", "c"], 2, pickFirst)).toEqual(["a", "b"]);
  });

  it("같은 후보를 두 번 뽑지 않는다", () => {
    const pool = ["a", "b", "c", "d", "e"];
    const winners = drawWinners(pool, 5, (max) => max - 1);
    expect(new Set(winners).size).toBe(5);
  });

  it("요청 수가 후보 수 이상이면 전원을 반환한다", () => {
    expect(drawWinners(["a", "b"], 5, pickFirst)).toHaveLength(2);
  });

  it("0명·음수는 빈 배열", () => {
    expect(drawWinners(["a", "b"], 0, pickFirst)).toEqual([]);
    expect(drawWinners(["a", "b"], -3, pickFirst)).toEqual([]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const pool = ["a", "b", "c"];
    drawWinners(pool, 3, (max) => max - 1);
    expect(pool).toEqual(["a", "b", "c"]);
  });
});
