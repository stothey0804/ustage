import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventStatusBadge, BookingStatusBadge } from "@/components/StatusBadge";

describe("EventStatusBadge", () => {
  it.each([
    ["draft", "오픈 전"],
    ["open", "티켓 오픈"],
    ["closed", "예매 마감"],
    ["ended", "스테이지 종료"],
  ])("%s 상태를 '%s'로 표시한다", (status, label) => {
    render(<EventStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("알 수 없는/null 상태는 draft로 표시한다", () => {
    render(<EventStatusBadge status={null} />);
    expect(screen.getByText("오픈 전")).toBeInTheDocument();
  });
});

describe("BookingStatusBadge", () => {
  it("confirmed는 유료면 입금완료, 무료면 참가확정", () => {
    const { rerender } = render(<BookingStatusBadge status="confirmed" />);
    expect(screen.getByText("입금완료")).toBeInTheDocument();

    rerender(<BookingStatusBadge status="confirmed" isFree />);
    expect(screen.getByText("참가확정")).toBeInTheDocument();
  });

  it("pending은 입금대기, cancelled는 취소", () => {
    const { rerender } = render(<BookingStatusBadge status="pending" />);
    expect(screen.getByText("입금대기")).toBeInTheDocument();

    rerender(<BookingStatusBadge status="cancelled" />);
    expect(screen.getByText("취소")).toBeInTheDocument();
  });
});
