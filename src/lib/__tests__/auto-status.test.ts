import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deriveAutoStatus, computeInitialStatus } from "@/lib/auto-status";

/** 고정된 현재 시각: 2026-07-15T12:00:00Z */
const NOW = new Date("2026-07-15T12:00:00Z");

const PAST = "2026-07-15T11:00:00Z";
const FUTURE = "2026-07-15T13:00:00Z";
const FAR_FUTURE = "2026-08-01T12:00:00Z";

type Fields = Parameters<typeof deriveAutoStatus>[0];

function event(overrides: Partial<Fields>): Fields {
  return {
    status: "draft",
    event_date: FAR_FUTURE,
    event_end_date: null,
    booking_start: null,
    booking_end: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deriveAutoStatus", () => {
  it("ended 상태는 더 이상 전환되지 않는다", () => {
    expect(deriveAutoStatus(event({ status: "ended", event_date: PAST }))).toBeNull();
  });

  it("종료 일시가 지나면 상태와 무관하게 ended", () => {
    for (const status of ["draft", "open", "closed"]) {
      expect(
        deriveAutoStatus(event({ status, event_date: PAST })),
      ).toBe("ended");
    }
  });

  it("event_end_date가 있으면 그것을 종료 기준으로 사용한다", () => {
    // 시작은 지났지만 종료가 남음 → 진행 중이므로 ended 아님
    expect(
      deriveAutoStatus(
        event({ status: "open", event_date: PAST, event_end_date: FUTURE }),
      ),
    ).toBeNull();
    expect(
      deriveAutoStatus(
        event({ status: "open", event_date: PAST, event_end_date: PAST }),
      ),
    ).toBe("ended");
  });

  it("draft + 예매 시작 도래 + 예매창 유효 → open", () => {
    expect(
      deriveAutoStatus(event({ booking_start: PAST, booking_end: FUTURE })),
    ).toBe("open");
    // booking_end 미설정도 오픈 허용
    expect(deriveAutoStatus(event({ booking_start: PAST }))).toBe("open");
  });

  it("draft는 예매 시작 전이거나 예매창이 지났으면 그대로 둔다", () => {
    expect(deriveAutoStatus(event({}))).toBeNull();
    expect(deriveAutoStatus(event({ booking_start: FUTURE }))).toBeNull();
    // 시작·종료 모두 과거 — 예매창이 이미 닫힘
    expect(
      deriveAutoStatus(event({ booking_start: PAST, booking_end: PAST })),
    ).toBeNull();
  });

  it("open + booking_end 경과 → closed", () => {
    expect(
      deriveAutoStatus(event({ status: "open", booking_end: PAST })),
    ).toBe("closed");
    expect(
      deriveAutoStatus(event({ status: "open", booking_end: FUTURE })),
    ).toBeNull();
    expect(deriveAutoStatus(event({ status: "open" }))).toBeNull();
  });

  it("closed는 자동으로 재오픈되지 않는다", () => {
    expect(
      deriveAutoStatus(
        event({ status: "closed", booking_start: PAST, booking_end: FUTURE }),
      ),
    ).toBeNull();
  });

  it("status가 null이면 draft로 취급한다", () => {
    expect(
      deriveAutoStatus(event({ status: null, booking_start: PAST })),
    ).toBe("open");
  });
});

describe("computeInitialStatus", () => {
  it("예매 시작이 이미 지났으면 open", () => {
    expect(
      computeInitialStatus({
        event_date: FAR_FUTURE,
        event_end_date: null,
        booking_start: PAST,
        booking_end: FUTURE,
      }),
    ).toBe("open");
  });

  it("행사가 이미 끝났으면 ended", () => {
    expect(
      computeInitialStatus({
        event_date: PAST,
        event_end_date: null,
        booking_start: null,
        booking_end: null,
      }),
    ).toBe("ended");
  });

  it("그 외에는 draft", () => {
    expect(
      computeInitialStatus({
        event_date: FAR_FUTURE,
        event_end_date: null,
        booking_start: FUTURE,
        booking_end: null,
      }),
    ).toBe("draft");
  });
});
