import { describe, expect, it } from "vitest";
import { buildBookingsCsv, csvCell } from "@/lib/bookings-csv";

const BASE = {
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  booking_no: 2,
  name: "홍길동",
  email: "hong@example.com",
  quantity: 3,
  depositor_name: "홍길동",
  deposited_at: "8월 1일 (토) 19:30",
  status: "confirmed",
  created_at: "2026-08-01T10:00:00Z",
};

function rows(csv: string) {
  return csv.split("\r\n");
}

describe("buildBookingsCsv", () => {
  it("헤더와 값 순서가 맞고 예매번호는 구매 범위로 표기된다", () => {
    const csv = buildBookingsCsv([{ ...BASE }], [], {
      isFree: false,
      price: 20000,
    });
    const [header, line] = rows(csv);
    expect(header.split(",")).toEqual([
      "예매번호",
      "이름",
      "이메일",
      "매수",
      "취소매수",
      "입금자명",
      "입금시간",
      "상태",
      "입장",
      "입금액(원)",
      "신청일시",
    ]);
    // 2번부터 3매 → #2–4
    expect(line.startsWith("#2–4,홍길동,hong@example.com,3,0,")).toBe(true);
    expect(line).toContain("60000");
  });

  it("부분 취소된 매수는 매수·금액·입장에서 빠지고 취소매수로 남는다", () => {
    const csv = buildBookingsCsv(
      [
        {
          ...BASE,
          cancelled_quantity: 1,
          booking_tickets: [
            { checked_in: true },
            { checked_in: false, cancelled_at: "2026-08-10T00:00:00Z" },
            { checked_in: false },
          ],
        },
      ],
      [],
      { isFree: false, price: 20000 },
    );
    const line = rows(csv)[1];
    const cells = line.split(",");
    expect(cells[0]).toBe("#2–4"); // 번호 범위는 구매 이력 그대로
    expect(cells[3]).toBe("2"); // 유효 매수
    expect(cells[4]).toBe("1"); // 취소 매수
    expect(line).toContain("1/2"); // 입장 = 살아 있는 티켓 기준
    expect(line).toContain("40000"); // 금액도 유효 매수 기준
  });

  it("커스텀 필드는 정의 순서대로 붙고 미응답은 빈 값", () => {
    const csv = buildBookingsCsv(
      [{ ...BASE, custom_answers: { f1: "20대" } }],
      [
        { id: "f1", label: "연령대", type: "select", required: true },
        { id: "f2", label: "메모", type: "text", required: false },
      ],
      { isFree: true, price: 0 },
    );
    const [header, line] = rows(csv);
    expect(header).toContain("연령대,메모");
    expect(line).toContain("20대,,");
  });

  it("쉼표·따옴표·개행이 든 값을 이스케이프한다", () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('그는 "왔다"')).toBe('"그는 ""왔다"""');
    expect(csvCell(null)).toBe("");
  });
});
