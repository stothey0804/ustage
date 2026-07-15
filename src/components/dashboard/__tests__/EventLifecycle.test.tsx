import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventLifecycle } from "@/components/dashboard/EventLifecycle";

/** 고정된 현재 시각: 2026-07-15T12:00:00Z */
const NOW = new Date("2026-07-15T12:00:00Z");
const PAST = "2026-07-15T11:00:00Z";
const FUTURE = "2026-07-16T12:00:00Z";
const FAR_FUTURE = "2026-08-01T12:00:00Z";

const LABELS = [
  "오픈 전",
  "예매 오픈",
  "예매 종료",
  "스테이지 전",
  "스테이지 중",
  "스테이지 종료",
];

function currentLabel(): string | undefined {
  // 현재 단계 라벨은 text-primary + font-semibold로 강조된다
  return LABELS.find((label) =>
    screen.getByText(label).className.includes("text-primary"),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventLifecycle", () => {
  it("6단계 라벨을 모두 렌더링한다", () => {
    render(
      <EventLifecycle
        event={{
          status: "draft",
          booking_start: null,
          booking_end: null,
          event_date: FAR_FUTURE,
          event_end_date: null,
        }}
      />,
    );
    for (const label of LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("예매 기간 중이면 '예매 오픈'이 현재 단계다", () => {
    render(
      <EventLifecycle
        event={{
          status: "open",
          booking_start: PAST,
          booking_end: FUTURE,
          event_date: FAR_FUTURE,
          event_end_date: null,
        }}
      />,
    );
    expect(currentLabel()).toBe("예매 오픈");
  });

  it("예매 종료 후 스테이지 전이면 '스테이지 전'이 현재 단계다", () => {
    render(
      <EventLifecycle
        event={{
          status: "closed",
          booking_start: PAST,
          booking_end: PAST,
          event_date: FAR_FUTURE,
          event_end_date: null,
        }}
      />,
    );
    expect(currentLabel()).toBe("스테이지 전");
  });

  it("스테이지가 끝나면 '스테이지 종료'가 현재 단계다", () => {
    render(
      <EventLifecycle
        event={{
          status: "ended",
          booking_start: null,
          booking_end: null,
          event_date: PAST,
          event_end_date: PAST,
        }}
      />,
    );
    expect(currentLabel()).toBe("스테이지 종료");
  });

  it("단계 일시를 KST로 표기한다", () => {
    render(
      <EventLifecycle
        event={{
          status: "draft",
          booking_start: "2026-07-20T01:00:00Z", // = 7.20 10:00 KST
          booking_end: null,
          event_date: FAR_FUTURE,
          event_end_date: null,
        }}
      />,
    );
    expect(screen.getByText("7.20 10:00")).toBeInTheDocument();
  });
});
