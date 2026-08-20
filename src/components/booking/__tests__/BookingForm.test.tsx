import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingForm } from "@/components/booking/BookingForm";

vi.mock("next/navigation", () => ({
  usePathname: () => "/e/test-slug",
}));

const BASE_PROPS = {
  eventId: "3b241101-e2bb-4255-8caf-4136c566a962",
  eventTitle: "겨울의 끝, 세 번째 무대",
  eventDateLabel: "2026년 2월 14일 (토) 19:30",
  price: 20000,
  bankInfo: "카카오뱅크 3333-123-456789 홍길동",
  customFields: [],
  isLoggedIn: false,
  isOpen: true,
};

// radix 모달이 body에 pointer-events:none을 걸어 user-event 기본 체크와 충돌
const user = () => userEvent.setup({ pointerEventsCheck: 0 });

function mockFetch(response: { ok: boolean; status?: number; json: unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.json,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingForm — 매수 선택(1단계)", () => {
  it("isOpen=false면 예매를 막고, 이미 예매한 사람의 통로를 준다", () => {
    render(
      <BookingForm
        {...BASE_PROPS}
        isOpen={false}
        closedReason="예매 기간이 종료되었습니다."
      />,
    );
    expect(screen.getByText("예매 기간이 종료되었습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "비회원 예매" })).not.toBeInTheDocument();

    // 마감 화면에서도 로그인·비회원 조회로 갈 수 있어야 한다
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?next=%2Fe%2Ftest-slug",
    );
    expect(
      screen.getByRole("link", { name: "비회원 조회" }),
    ).toHaveAttribute("href", "/e/test-slug/me");
  });

  it("마감 + 로그인 상태면 내 티켓으로 보낸다", () => {
    render(
      <BookingForm
        {...BASE_PROPS}
        isOpen={false}
        isLoggedIn
        userEmail="me@example.com"
        closedReason="예매가 마감되었습니다."
      />,
    );
    expect(
      screen.getByRole("link", { name: "내 티켓 확인하기" }),
    ).toHaveAttribute("href", "/dashboard/bookings");
    // 비회원 조회는 노출하지 않는다(로그인 사용자에게는 맞는 경로가 아니다)
    expect(
      screen.queryByRole("link", { name: "비회원 조회" }),
    ).not.toBeInTheDocument();
  });

  it("비로그인 시 로그인/비회원 예매 버튼을 보여준다", () => {
    render(<BookingForm {...BASE_PROPS} />);
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?next=%2Fe%2Ftest-slug",
    );
    expect(screen.getByRole("button", { name: "비회원 예매" })).toBeInTheDocument();
  });

  it("매수를 늘리면 총 결제금액이 갱신된다", async () => {
    const u = user();
    render(<BookingForm {...BASE_PROPS} />);

    expect(screen.getByText("20,000원")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "매수 늘리기" }));
    expect(screen.getByText("40,000원")).toBeInTheDocument();
  });

  it("매수는 1매 미만으로 줄일 수 없고 잔여석 상한을 넘지 않는다", async () => {
    const u = user();
    render(<BookingForm {...BASE_PROPS} maxQuantity={2} />);

    expect(screen.getByRole("button", { name: "매수 줄이기" })).toBeDisabled();
    await u.click(screen.getByRole("button", { name: "매수 늘리기" }));
    expect(screen.getByRole("button", { name: "매수 늘리기" })).toBeDisabled();
    expect(screen.getByText("40,000원")).toBeInTheDocument();
  });
});

describe("BookingForm — 예매자 정보(2단계)", () => {
  it("주의사항(noticeHtml)을 폼 상단에 렌더링한다", async () => {
    render(
      <BookingForm
        {...BASE_PROPS}
        noticeHtml="<p>예매 후 <strong>환불 불가</strong>입니다.</p>"
      />,
    );
    await user().click(screen.getByRole("button", { name: "비회원 예매" }));
    expect(screen.getByText("환불 불가")).toBeInTheDocument();
  });

  it("요약 카드에 스테이지와 매수를 보여주고 입금자명 필드를 노출한다", async () => {
    render(<BookingForm {...BASE_PROPS} isLoggedIn userEmail="me@example.com" />);
    await user().click(screen.getByRole("button", { name: "예매하기" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(BASE_PROPS.eventTitle)).toBeInTheDocument();
    expect(
      within(dialog).getByText("2026년 2월 14일 (토) 19:30"),
    ).toBeInTheDocument();
    // 몇 장을 신청하는지 이 단계에서도 분명히 보여야 한다
    expect(within(dialog).getByText(/예매 매수/)).toBeInTheDocument();
    expect(within(dialog).getByText("1매")).toBeInTheDocument();
    expect(screen.getByLabelText(/입금자명/)).toBeInTheDocument();
  });

  it("'예매자 이름과 동일합니다'가 기본 켜져 있고, 해제하면 입금자명을 직접 입력할 수 있다", async () => {
    const u = user();
    render(<BookingForm {...BASE_PROPS} isLoggedIn userEmail="me@example.com" />);
    await u.click(screen.getByRole("button", { name: "예매하기" }));

    const sameName = screen.getByLabelText("예매자 이름과 동일합니다");
    expect(sameName).toBeChecked();
    expect(screen.getByLabelText(/입금자명/)).toBeDisabled();

    await u.click(sameName);
    expect(screen.getByLabelText(/입금자명/)).toBeEnabled();
  });

  it("비회원 비밀번호 칸에 암호화 저장 안내를 보여준다", async () => {
    // 주최자도 볼 수 없다는 사실을 참석자가 알 수 있어야 한다
    render(<BookingForm {...BASE_PROPS} />);
    await user().click(screen.getByRole("button", { name: "비회원 예매" }));
    expect(
      screen.getByText(/암호화되어 저장되며 주최자도 확인할 수 없어요/),
    ).toBeInTheDocument();
  });

  it("비회원은 4자 미만 비밀번호로 제출할 수 없다", async () => {
    const u = user();
    render(<BookingForm {...BASE_PROPS} price={0} />);
    await u.click(screen.getByRole("button", { name: "비회원 예매" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.type(screen.getByLabelText(/이메일/), "hong@example.com");
    await u.type(screen.getByLabelText(/비밀번호/), "123");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));
    expect(
      await screen.findByText("비밀번호는 4자 이상이어야 합니다."),
    ).toBeInTheDocument();
  });

  it("비회원 제출 시 최종 확인 모달을 먼저 띄운다", async () => {
    const u = user();
    render(<BookingForm {...BASE_PROPS} price={0} />);
    await u.click(screen.getByRole("button", { name: "비회원 예매" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.type(screen.getByLabelText(/이메일/), "hong@example.com");
    await u.type(screen.getByLabelText(/비밀번호/), "1234");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));
    expect(
      await screen.findByText("입력 내용을 확인해 주세요"),
    ).toBeInTheDocument();
  });
});

describe("BookingForm — 잔여석 부족(동시 제출)", () => {
  /** 2단계까지 진행해 제출하고, 서버가 capacity_exceeded를 돌려주게 한다 */
  async function submitAndExceed(remaining: number) {
    mockFetch({
      ok: false,
      status: 409,
      json: {
        code: "capacity_exceeded",
        remaining,
        error: `잔여 좌석이 ${remaining}석입니다. 매수를 조정해 주세요.`,
      },
    });
    const u = user();
    render(
      <BookingForm {...BASE_PROPS} price={0} isLoggedIn userEmail="me@example.com" />,
    );
    await u.click(screen.getByRole("button", { name: "참가 신청하기" }));
    // 3매로 올린 뒤 제출
    const dialog = screen.getByRole("dialog");
    const plus = within(dialog).getByRole("button", { name: "매수 늘리기" });
    await u.click(plus);
    await u.click(plus);
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));
    return u;
  }

  it("모달을 닫지 않고 매수를 줄일 수 있게 상한을 낮춘다", async () => {
    await submitAndExceed(2);

    // 폼 모달이 그대로 열려 있어야 한다
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/방금 좌석이 줄어 최대 2매까지/),
    ).toBeInTheDocument();
    // 초과분은 잔여석으로 자동 조정된다
    expect(within(dialog).getByText("2매")).toBeInTheDocument();
    // 상한에 걸려 더 늘릴 수 없다
    expect(
      within(dialog).getByRole("button", { name: "매수 늘리기" }),
    ).toBeDisabled();
  });

  it("좌석이 0이면 매진을 알리고 제출을 막는다", async () => {
    await submitAndExceed(0);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/좌석이 모두 찼어요/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "참가 신청" }),
    ).toBeDisabled();
  });
});

describe("BookingForm — 제출과 안내(3단계)", () => {
  it("무료 신청은 확정 안내와 예약번호를 보여준다", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: { bookingId: "3b241101-e2bb-4255-8caf-4136c566a962" },
    });
    const u = user();
    render(
      <BookingForm
        {...BASE_PROPS}
        price={0}
        isLoggedIn
        userEmail="me@example.com"
      />,
    );
    await u.click(screen.getByRole("button", { name: "참가 신청하기" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));

    expect(
      await screen.findByText("참가가 확정되었습니다"),
    ).toBeInTheDocument();
    expect(screen.getByText("BK-3B2411")).toBeInTheDocument();

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({
      event_id: BASE_PROPS.eventId,
      name: "홍길동",
      email: "me@example.com",
      quantity: 1,
      additional: false,
    });
  });

  it("유료 예매는 입금 예상 시간 없이 제출할 수 없다", async () => {
    const fetchMock = mockFetch({ ok: true, json: { bookingId: BASE_PROPS.eventId } });
    const u = user();
    render(<BookingForm {...BASE_PROPS} isLoggedIn userEmail="me@example.com" />);

    await u.click(screen.getByRole("button", { name: "예매하기" }));
    await u.type(screen.getByLabelText("이름 *"), "홍길동");
    await u.click(screen.getByRole("button", { name: "입금 안내 받기" }));

    expect(
      await screen.findByText("입금 예상 시간을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("이미 예매한 이메일(409 duplicate_email)이면 추가 예약 확인 모달을 띄운다", async () => {
    mockFetch({ ok: false, status: 409, json: { code: "duplicate_email" } });
    const u = user();
    render(
      <BookingForm
        {...BASE_PROPS}
        price={0}
        isLoggedIn
        userEmail="me@example.com"
      />,
    );
    await u.click(screen.getByRole("button", { name: "참가 신청하기" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));

    const modalTitle = await screen.findByText("이미 예매한 내역이 있습니다");
    const modal = modalTitle.closest('[role="dialog"]') as HTMLElement;
    expect(
      within(modal).getByRole("button", { name: "추가 예약하기" }),
    ).toBeInTheDocument();
  });

  it("서버 에러 메시지를 표시한다", async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: { error: "좌석이 부족합니다. 잔여 1석." },
    });
    const u = user();
    render(
      <BookingForm
        {...BASE_PROPS}
        price={0}
        isLoggedIn
        userEmail="me@example.com"
      />,
    );
    await u.click(screen.getByRole("button", { name: "참가 신청하기" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));
    expect(
      await screen.findByText("좌석이 부족합니다. 잔여 1석."),
    ).toBeInTheDocument();
  });
});
