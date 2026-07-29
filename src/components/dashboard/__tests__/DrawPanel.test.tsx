import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

const CANDIDATES = [1, 3, 5, 7, 9, 11, 12, 14, 16, 18, 20, 22];

function renderPanel(overrides: Partial<Parameters<typeof DrawPanel>[0]> = {}) {
  return render(
    <DrawPanel
      eventId="e1"
      candidateCount={12}
      candidateNos={CANDIDATES}
      pastRounds={[]}
      {...overrides}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DrawPanel", () => {
  it("추첨 대상 수를 보여주고 '이전 당첨자 제외'가 기본 켜져 있다", () => {
    renderPanel();

    expect(screen.getByText("12명")).toBeInTheDocument();
    expect(screen.getByLabelText("이전 당첨자 제외")).toBeChecked();
  });

  it("입장 완료가 없으면 추첨 버튼을 막고 안내한다", () => {
    renderPanel({ candidateCount: 0, candidateNos: [] });

    expect(screen.getByRole("button", { name: /추첨하기/ })).toBeDisabled();
    expect(
      screen.getByText(/아직 입장 처리된 참석자가 없습니다/),
    ).toBeInTheDocument();
  });

  it("추첨을 누르면 모달이 열려 번호를 굴리고, 결과를 큰 번호로 보여준다", async () => {
    runDrawMock.mockResolvedValue({
      round: 2,
      candidateCount: 12,
      winners: [
        { attendeeNo: 7, maskedName: "김*영", maskedEmail: "seyo***@ustage.im" },
      ],
    });

    const u = user();
    renderPanel();
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    // 굴리는 동안에는 '추첨 중'
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("추첨 중")).toBeInTheDocument();

    // 최소 연출 시간이 지나면 결과로 바뀐다
    expect(
      await within(dialog).findByText("2회차 당첨자 1명", undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("#7")).toBeInTheDocument();
    expect(within(dialog).getByText("김*영")).toBeInTheDocument();
    expect(within(dialog).getByText("seyo***@ustage.im")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /한 번 더 추첨/ }),
    ).toBeInTheDocument();

    expect(runDrawMock).toHaveBeenCalledWith("e1", {
      count: 1,
      excludePrevious: true,
    });
  });

  it("여러 명을 뽑으면 당첨자 수만큼 번호를 보여준다", async () => {
    runDrawMock.mockResolvedValue({
      round: 1,
      candidateCount: 12,
      winners: [
        { attendeeNo: 3, maskedName: "박*현", maskedEmail: "doh***@a.com" },
        { attendeeNo: 9, maskedName: "이*민", maskedEmail: "sumi***@b.com" },
      ],
    });

    const u = user();
    renderPanel();
    await u.clear(screen.getByLabelText("뽑을 인원"));
    await u.type(screen.getByLabelText("뽑을 인원"), "2");
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("1회차 당첨자 2명", undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("#3")).toBeInTheDocument();
    expect(within(dialog).getByText("#9")).toBeInTheDocument();

    expect(runDrawMock).toHaveBeenCalledWith("e1", {
      count: 2,
      excludePrevious: true,
    });
  });

  it("같은 예매의 티켓 2장이 당첨되면 번호로 구분해 두 장 다 보여준다", async () => {
    runDrawMock.mockResolvedValue({
      round: 3,
      candidateCount: 6,
      winners: [
        { attendeeNo: 2, maskedName: "김*연", maskedEmail: "seoy***@a.com" },
        { attendeeNo: 3, maskedName: "김*연", maskedEmail: "seoy***@a.com" },
      ],
    });

    const u = user();
    renderPanel();
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("3회차 당첨자 2명", undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("#2")).toBeInTheDocument();
    expect(within(dialog).getByText("#3")).toBeInTheDocument();
    expect(within(dialog).getAllByText("김*연")).toHaveLength(2);
  });

  it("체크박스를 해제하면 제외 없이 추첨을 요청한다", async () => {
    runDrawMock.mockResolvedValue({ round: 1, candidateCount: 3, winners: [] });

    const u = user();
    renderPanel({ candidateCount: 3, candidateNos: [1, 2, 3] });
    await u.click(screen.getByLabelText("이전 당첨자 제외"));
    await u.click(screen.getByRole("button", { name: /추첨하기/ }));

    expect(runDrawMock).toHaveBeenCalledWith("e1", {
      count: 1,
      excludePrevious: false,
    });
  });

  it("지난 회차 기록을 회차별로 보여준다", () => {
    renderPanel({
      pastRounds: [
        {
          round: 2,
          winners: [
            { attendeeNo: 9, maskedName: "박*현", maskedEmail: "doh***@a.com" },
          ],
        },
        {
          round: 1,
          winners: [
            { attendeeNo: 3, maskedName: "이*민", maskedEmail: "sumi***@b.com" },
          ],
        },
      ],
    });

    expect(screen.getByText("추첨 기록 2회")).toBeInTheDocument();
    expect(screen.getByText("2회차 · 1명")).toBeInTheDocument();
    expect(screen.getByText("1회차 · 1명")).toBeInTheDocument();
    expect(screen.getByText(/지금까지 당첨 2명/)).toBeInTheDocument();
  });
});
