import { describe, expect, it } from "vitest";
import {
  drawWinners,
  selectDrawCandidates,
  type DrawCandidateRow,
} from "@/lib/lottery";

function row(
  overrides: Partial<DrawCandidateRow> & Pick<DrawCandidateRow, "id" | "booking_no">
): DrawCandidateRow {
  return {
    name: "홍길동",
    email: "hong@example.com",
    status: "confirmed",
    booking_tickets: [{ checked_in: true }],
    ...overrides,
  };
}

describe("selectDrawCandidates", () => {
  it("입장 완료 티켓이 있는 예매만 후보로 삼는다", () => {
    const candidates = selectDrawCandidates([
      row({ id: "a", booking_no: 1 }),
      row({ id: "b", booking_no: 2, booking_tickets: [{ checked_in: false }] }),
      row({ id: "c", booking_no: 3, booking_tickets: [] }),
      row({ id: "d", booking_no: 4, booking_tickets: null }),
    ]);
    expect(candidates.map((c) => c.bookingId)).toEqual(["a"]);
  });

  it("2매 중 1매만 입장했어도 후보에 포함한다", () => {
    const candidates = selectDrawCandidates([
      row({
        id: "a",
        booking_no: 1,
        booking_tickets: [{ checked_in: true }, { checked_in: false }],
      }),
    ]);
    expect(candidates).toHaveLength(1);
  });

  it("취소된 예매는 입장 기록이 있어도 제외한다", () => {
    const candidates = selectDrawCandidates([
      row({ id: "a", booking_no: 1, status: "cancelled" }),
      row({ id: "b", booking_no: 2 }),
    ]);
    expect(candidates.map((c) => c.bookingId)).toEqual(["b"]);
  });

  it("이전 당첨자를 제외한다", () => {
    const candidates = selectDrawCandidates(
      [
        row({ id: "a", booking_no: 1 }),
        row({ id: "b", booking_no: 2 }),
        row({ id: "c", booking_no: 3 }),
      ],
      new Set(["b"])
    );
    expect(candidates.map((c) => c.bookingId)).toEqual(["a", "c"]);
  });

  it("예매번호 오름차순으로 정렬하고 이메일 없으면 빈 문자열", () => {
    const candidates = selectDrawCandidates([
      row({ id: "c", booking_no: 30 }),
      row({ id: "a", booking_no: 2, email: null }),
    ]);
    expect(candidates.map((c) => c.bookingNo)).toEqual([2, 30]);
    expect(candidates[0].email).toBe("");
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
