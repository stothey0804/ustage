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

  it("빈 목록은 0석", () => {
    expect(occupiedSeats([])).toBe(0);
    expect(remainingSeats([], 10)).toBe(10);
  });
});
