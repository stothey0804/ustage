import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DrawPanel } from "@/components/dashboard/DrawPanel";
import { runDraw } from "@/app/actions/draw";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions/draw", () => ({
  runDraw: vi.fn(),
  resetDraws: vi.fn(),
}));

const runDrawMock = vi.mocked(runDraw);
const user = () => userEvent.setup({ pointerEventsCheck: 0 });

afterEach(() => {
  vi.clearAllMocks();
});

describe("DrawPanel", () => {
  it("추첨 대상 수를 보여주고 '이전 당첨자 제외'가 기본 켜져 있다", () => {
    render(<DrawPanel eventId="e1" candidateCount={12} pastRounds={[]} />);

    expect(screen.getByText("12명")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 당첨자 제외")).toBeChecked();
  });

  it("입장 완료가 없으면 추첨 버튼을 막고 안내한다", () => {
    render(<DrawPanel eventId="e1" candidateCount={0} pastRounds={[]} />);

    expect(screen.getByRole("button", { name: /추첨하기/ })).toBeDisabled();
    expect(
      screen.getByText(/아직 입장 처리된 참석자가 없습니다/),
    ).toBeInTheDocument();
  });

  it("추첨 결과를 예매번호와 마스킹된 정보로 보여준다", async () => {
    runDrawMock.mockResolvedValue({
      round: 2,
      candidateCount: 12,
      winners: [
        { bookingNo: 7, maskedName: "김*영", maskedEmail: "seyo***@ustage.im" },
      ],
    });

    const u = user();
    render(<DrawPanel eventId="e1" candidateCount={12} pastRounds={[]} />);
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    expect(await screen.findByText("2회차 당첨자 1명")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("김*영")).toBeInTheDocument();
    expect(screen.getByText("seyo***@ustage.im")).toBeInTheDocument();

    expect(runDrawMock).toHaveBeenCalledWith("e1", {
      count: 1,
      excludePrevious: true,
    });
  });

  it("체크박스를 해제하면 제외 없이 추첨을 요청한다", async () => {
    runDrawMock.mockResolvedValue({ round: 1, candidateCount: 3, winners: [] });

    const u = user();
    render(<DrawPanel eventId="e1" candidateCount={3} pastRounds={[]} />);
    await u.click(screen.getByLabelText("이전 당첨자 제외"));
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    expect(runDrawMock).toHaveBeenCalledWith("e1", {
      count: 1,
      excludePrevious: false,
    });
  });

  it("지난 회차 기록을 회차별로 보여준다", () => {
    render(
      <DrawPanel
        eventId="e1"
        candidateCount={12}
        pastRounds={[
          {
            round: 2,
            winners: [
              { bookingNo: 9, maskedName: "박*현", maskedEmail: "doh***@a.com" },
            ],
          },
          {
            round: 1,
            winners: [
              { bookingNo: 3, maskedName: "이*민", maskedEmail: "sumi***@b.com" },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("추첨 기록 2회")).toBeInTheDocument();
    expect(screen.getByText("2회차 · 1명")).toBeInTheDocument();
    expect(screen.getByText("1회차 · 1명")).toBeInTheDocument();
    expect(screen.getByText(/지금까지 당첨 2명/)).toBeInTheDocument();
  });
});
