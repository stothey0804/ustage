import { describe, expect, it } from "vitest";
import { eventSchema } from "@/lib/validations/event";

const VALID = {
  title: "여름 스테이지",
  event_date: "2026-08-01T19:00",
  venue: "홍대 클럽",
  price: 20000,
  bank_info: "카카오뱅크 3333-123-456789 홍길동",
  contact: "010-1234-5678",
};

describe("eventSchema", () => {
  it("최소 필수값으로 통과한다", () => {
    const r = eventSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it("필수값 누락 시 한국어 에러 메시지를 낸다", () => {
    const r = eventSchema.safeParse({ ...VALID, title: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("스테이지 제목을 입력해 주세요.");
  });

  it("가격은 0 이상이어야 한다 (무료 허용)", () => {
    expect(eventSchema.safeParse({ ...VALID, price: 0 }).success).toBe(true);
    expect(eventSchema.safeParse({ ...VALID, price: -1 }).success).toBe(false);
  });

  it("좌석 수는 1 이상", () => {
    expect(eventSchema.safeParse({ ...VALID, capacity: 1 }).success).toBe(true);
    expect(eventSchema.safeParse({ ...VALID, capacity: 0 }).success).toBe(false);
  });

  it("종료 일시는 시작 일시보다 뒤여야 한다", () => {
    const r = eventSchema.safeParse({
      ...VALID,
      event_end_date: "2026-08-01T18:00",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["event_end_date"]);

    expect(
      eventSchema.safeParse({ ...VALID, event_end_date: "2026-08-01T21:00" })
        .success,
    ).toBe(true);
  });

  it("예매 종료는 예매 시작보다 뒤여야 한다", () => {
    const r = eventSchema.safeParse({
      ...VALID,
      booking_start: "2026-07-20T10:00",
      booking_end: "2026-07-19T10:00",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["booking_end"]);
  });

  it("예매 종료는 스테이지 시작보다 앞이어야 한다 (같은 시각 허용)", () => {
    expect(
      eventSchema.safeParse({ ...VALID, booking_end: "2026-08-01T20:00" })
        .success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({ ...VALID, booking_end: "2026-08-01T19:00" })
        .success,
    ).toBe(true);
  });

  it("한쪽 일시만 설정된 경우 비교 검증을 건너뛴다", () => {
    expect(
      eventSchema.safeParse({ ...VALID, booking_end: "2026-07-20T10:00" })
        .success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({ ...VALID, booking_start: "2026-07-20T10:00" })
        .success,
    ).toBe(true);
  });

  it("booking_notice(주의사항)는 선택 필드다", () => {
    expect(
      eventSchema.safeParse({ ...VALID, booking_notice: "<p>환불 불가</p>" })
        .success,
    ).toBe(true);
    expect(eventSchema.safeParse(VALID).success).toBe(true);
  });

  it("커스텀 필드 구조를 검증한다", () => {
    expect(
      eventSchema.safeParse({
        ...VALID,
        custom_fields: [
          { id: "f1", label: "연령대", type: "select", required: true, options: ["10대", "20대"] },
        ],
      }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({
        ...VALID,
        custom_fields: [{ id: "f1", label: "", type: "text", required: false }],
      }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...VALID,
        custom_fields: [{ id: "f1", label: "x", type: "date", required: false }],
      }).success,
    ).toBe(false);
  });
});
