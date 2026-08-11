import { describe, expect, it } from "vitest";
import { canSelfCancel, selfCancelBlockReason } from "@/lib/booking-cancel";

const NOW = new Date("2026-08-11T12:00:00+09:00");
const FUTURE = new Date("2026-09-01T19:00:00+09:00");
const PAST = new Date("2026-08-01T19:00:00+09:00");

const base = {
  status: "pending",
  price: 20000,
  checkedIn: false,
  eventEnd: FUTURE,
  now: NOW,
};

describe("selfCancelBlockReason", () => {
  it("입금대기는 직접 취소할 수 있다", () => {
    expect(selfCancelBlockReason(base)).toBeNull();
    expect(canSelfCancel(base)).toBe(true);
  });

  it("입금이 확인된 유료 예약은 직접 취소할 수 없다", () => {
    // 환불은 주최자가 계좌로 처리해야 하므로 명단에서 임의로 사라지면 안 된다
    expect(selfCancelBlockReason({ ...base, status: "confirmed" })).toBe(
      "입금이 확인된 예약은 직접 취소할 수 없습니다. 취소·환불은 주최자에게 문의해 주세요.",
    );
    expect(canSelfCancel({ ...base, status: "confirmed" })).toBe(false);
  });

  it("무료 스테이지는 확정 상태에서도 직접 취소할 수 있다", () => {
    // 무료는 제출 즉시 confirmed이고 환불할 것이 없다 — 좌석을 돌려받는 쪽이 낫다
    expect(
      selfCancelBlockReason({ ...base, status: "confirmed", price: 0 }),
    ).toBeNull();
  });

  it("입장 처리된 예약은 상태와 무관하게 막는다", () => {
    expect(
      selfCancelBlockReason({ ...base, checkedIn: true }),
    ).toBe(
      "이미 입장 처리된 예약은 직접 취소할 수 없습니다. 주최자에게 문의해 주세요.",
    );
    expect(
      selfCancelBlockReason({ ...base, status: "confirmed", price: 0, checkedIn: true }),
    ).not.toBeNull();
  });

  it("이미 취소된 예약", () => {
    expect(selfCancelBlockReason({ ...base, status: "cancelled" })).toBe(
      "이미 취소된 예약입니다.",
    );
  });

  it("종료된 스테이지는 막는다", () => {
    expect(selfCancelBlockReason({ ...base, eventEnd: PAST })).toBe(
      "이미 종료된 스테이지의 예약은 직접 취소할 수 없습니다. 주최자에게 문의해 주세요.",
    );
  });

  it("종료 시각을 모르면 기간 검사를 건너뛴다", () => {
    expect(selfCancelBlockReason({ ...base, eventEnd: null })).toBeNull();
    expect(
      selfCancelBlockReason({ ...base, eventEnd: new Date("not-a-date") }),
    ).toBeNull();
  });
});
