import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BookingLookup } from "@/components/booking/BookingLookup";

const EVENT = {
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  title: "겨울의 끝, 세 번째 무대",
  event_date: "2026-09-01T19:00:00+09:00",
  event_end_date: null,
  venue: "홍대 클럽",
  bank_info: "카카오뱅크 3333-123-456789 홍길동",
  slug: "test-slug",
  contact: "010-1234-5678",
  price: 20000,
  cancel_policy_html: null,
  remaining_seats: 10,
};

function mockLookup(booking: Record<string, unknown>) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ bookings: [{ ...booking, events: EVENT }] }),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const BASE = {
  id: "9f1c2b40-0000-4000-8000-000000000001",
  name: "홍길동",
  email: "hong@example.com",
  status: "confirmed",
  quantity: 2,
  booking_no: 2,
  depositor_name: "홍길동",
  deposited_at: "9월 1일 (화) 10:00",
  created_at: "2026-08-20T10:00:00Z",
  tickets: [],
};

async function lookup() {
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  render(<BookingLookup eventId={EVENT.id} />);
  await u.type(screen.getByLabelText(/이메일/), "hong@example.com");
  await u.type(screen.getByLabelText(/비밀번호/), "1234");
  await u.click(screen.getByRole("button", { name: "예약 조회" }));
  return u;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingLookup — 결과 카드", () => {
  it("예매번호를 회원 예약 상세와 같은 범위 표기로 강조한다", async () => {
    mockLookup(BASE);
    await lookup();

    // 2번부터 2매 → #2–3 (범위는 구매 매수 기준)
    expect(await screen.findByText("#2–3")).toBeInTheDocument();
  });

  it("상태와 매수를 배지로 보여준다", async () => {
    mockLookup(BASE);
    await lookup();

    expect(await screen.findByText("입금완료")).toBeInTheDocument();
    expect(screen.getByText("2매")).toBeInTheDocument();
  });

  it("부분 취소는 유효 매수와 취소 매수를 함께 보여준다", async () => {
    // 3매 중 1매 취소 → 유효 2매
    mockLookup({ ...BASE, quantity: 3, cancelled_quantity: 1 });
    await lookup();

    expect(await screen.findByText("#2–4")).toBeInTheDocument();
    expect(screen.getByText("2매")).toBeInTheDocument();
    expect(screen.getByText("1매 취소")).toBeInTheDocument();
  });

  it("예매번호가 없으면 uuid 파생 코드로 폴백한다", async () => {
    mockLookup({ ...BASE, booking_no: null, quantity: 1 });
    await lookup();

    expect(await screen.findByText("BK-9F1C2B")).toBeInTheDocument();
  });
});
