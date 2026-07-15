import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingForm } from "@/components/booking/BookingForm";

vi.mock("next/navigation", () => ({
  usePathname: () => "/e/test-slug",
}));

const BASE_PROPS = {
  eventId: "3b241101-e2bb-4255-8caf-4136c566a962",
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

describe("BookingForm — 예매 불가/진입", () => {
  it("isOpen=false면 사유만 표시한다", () => {
    render(
      <BookingForm
        {...BASE_PROPS}
        isOpen={false}
        closedReason="예매 기간이 종료되었습니다."
      />,
    );
    expect(screen.getByText("예매 기간이 종료되었습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "비회원 예매" })).not.toBeInTheDocument();
  });

  it("비로그인 시 로그인/비회원 예매 버튼을 보여준다", () => {
    render(<BookingForm {...BASE_PROPS} />);
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?next=%2Fe%2Ftest-slug",
    );
    expect(screen.getByRole("button", { name: "비회원 예매" })).toBeInTheDocument();
  });
});

describe("BookingForm — 신청 폼 모달", () => {
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

  it("유료 스테이지는 총 입금액을 표시한다", async () => {
    render(<BookingForm {...BASE_PROPS} isLoggedIn userEmail="me@example.com" />);
    await user().click(screen.getByRole("button", { name: "예매하기" }));
    expect(screen.getByText("20,000원")).toBeInTheDocument();
    expect(screen.getByLabelText(/입금자명/)).toBeInTheDocument();
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

describe("BookingForm — 제출", () => {
  it("로그인 회원의 무료 신청은 확인 모달 없이 바로 제출되고 완료 화면을 보여준다", async () => {
    const fetchMock = mockFetch({ ok: true, json: {} });
    const u = user();
    render(
      <BookingForm
        {...BASE_PROPS}
        price={0}
        isLoggedIn
        userEmail="me@example.com"
      />,
    );
    await u.click(screen.getByRole("button", { name: "예매하기" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));

    expect(
      await screen.findByText("참가 신청이 완료되었습니다."),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({ method: "POST" }),
    );
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
    await u.click(screen.getByRole("button", { name: "예매하기" }));
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
    await u.click(screen.getByRole("button", { name: "예매하기" }));
    await u.type(screen.getByLabelText(/이름/), "홍길동");
    await u.click(screen.getByRole("button", { name: "참가 신청" }));
    expect(
      await screen.findByText("좌석이 부족합니다. 잔여 1석."),
    ).toBeInTheDocument();
  });
});
