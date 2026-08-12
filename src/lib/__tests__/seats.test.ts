import { describe, expect, it } from "vitest";
import {
  confirmedSeats,
  occupancyPercent,
  occupiedSeats,
  pendingSeats,
  remainingSeats,
} from "@/lib/seats";

// 입금대기 2매 + 확정 3매 + 취소 5매
const BOOKINGS = [
  { status: "pending", quantity: 2 },
  { status: "confirmed", quantity: 3 },
  { status: "cancelled", quantity: 5 },
];

describe("좌석 계산", () => {
  it("점유 좌석은 취소를 제외한 전부(입금대기 포함)를 quantity로 합산한다", () => {
    expect(occupiedSeats(BOOKINGS)).toBe(5);
    expect(confirmedSeats(BOOKINGS)).toBe(3);
    expect(pendingSeats(BOOKINGS)).toBe(2);
  });

  it("quantity가 없으면 1석으로 본다", () => {
    expect(occupiedSeats([{ status: "pending", quantity: null }])).toBe(1);
  });

  it("남은 좌석은 점유 기준이고 정원이 없으면 null", () => {
    expect(remainingSeats(BOOKINGS, 10)).toBe(5);
    expect(remainingSeats(BOOKINGS, null)).toBeNull();
    expect(remainingSeats(BOOKINGS, 0)).toBeNull();
    // 정원을 줄인 뒤 초과 상태여도 음수를 내지 않는다
    expect(remainingSeats(BOOKINGS, 3)).toBe(0);
  });

  it("점유율은 정원 기준 백분율이며 100을 넘지 않는다", () => {
    expect(occupancyPercent(BOOKINGS, 10)).toBe(50);
    expect(occupancyPercent(BOOKINGS, 3)).toBe(100);
    expect(occupancyPercent(BOOKINGS, null)).toBeNull();
  });

  it("부분 취소된 매수는 좌석에서 빠진다", () => {
    // 3매 중 1매 취소 → 2석만 점유
    const partial = [{ status: "confirmed", quantity: 3, cancelled_quantity: 1 }];
    expect(occupiedSeats(partial)).toBe(2);
    expect(confirmedSeats(partial)).toBe(2);
    expect(remainingSeats(partial, 10)).toBe(8);
    // 전량 취소분이 quantity와 같아도 음수가 되지 않는다
    expect(
      occupiedSeats([{ status: "pending", quantity: 2, cancelled_quantity: 5 }]),
    ).toBe(0);
    // 컬럼이 없으면 0으로 본다(좌석을 과소 계산하지 않는다)
    expect(occupiedSeats([{ status: "pending", quantity: 2 }])).toBe(2);
  });

  it("빈 목록은 0석", () => {
    expect(occupiedSeats([])).toBe(0);
    expect(remainingSeats([], 10)).toBe(10);
  });
});
