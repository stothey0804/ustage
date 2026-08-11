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

  it("가격·좌석 상한을 넘기면 DB 오버플로 대신 폼 에러로 막는다", () => {
    // integer 컬럼이므로 상한이 없으면 저장 시점에 정체불명 실패가 된다
    expect(
      eventSchema.safeParse({ ...VALID, price: 2_147_483_648 }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...VALID, price: 10_000_000 }).success).toBe(
      true,
    );
    expect(eventSchema.safeParse({ ...VALID, price: 1000.5 }).success).toBe(
      false,
    );
    expect(
      eventSchema.safeParse({ ...VALID, capacity: 3_000_000_000 }).success,
    ).toBe(false);
  });

  it("유료 스테이지는 입금 계좌가 필수다 (필드에 에러가 붙는다)", () => {
    const r = eventSchema.safeParse({ ...VALID, price: 20000, bank_info: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["bank_info"]);
    expect(r.error?.issues[0]?.message).toBe(
      "유료 스테이지는 입금 계좌를 입력해 주세요.",
    );

    // 공백만 넣은 것도 미입력으로 본다
    expect(
      eventSchema.safeParse({ ...VALID, price: 20000, bank_info: "   " })
        .success,
    ).toBe(false);

    // 무료 스테이지는 계좌 없이 통과
    expect(
      eventSchema.safeParse({ ...VALID, price: 0, bank_info: "" }).success,
    ).toBe(true);
  });

  it("숫자가 아닌 가격·좌석은 한국어 메시지를 낸다", () => {
    // 빈 입력이 NaN/undefined로 들어오면 zod 기본 영문 메시지가 노출되던 자리
    for (const bad of [NaN, undefined]) {
      const r = eventSchema.safeParse({ ...VALID, price: bad });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(
        "티켓 가격을 숫자로 입력해 주세요. (무료는 0)",
      );
    }

    const c = eventSchema.safeParse({ ...VALID, capacity: NaN });
    expect(c.success).toBe(false);
    expect(c.error?.issues[0]?.message).toBe("좌석 한도를 숫자로 입력해 주세요.");
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

  it("예매 종료 미지정(빈 문자열 포함)을 허용한다", () => {
    expect(
      eventSchema.safeParse({
        ...VALID,
        booking_start: "2026-07-20T10:00",
        booking_end: "",
      }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({ ...VALID, booking_start: "", booking_end: "" })
        .success,
    ).toBe(true);
  });

  it("예매 시작은 스테이지 종료보다 앞이어야 한다 (열리지 못하는 설정 차단)", () => {
    // 예매 종료가 없으면 booking_end 검증이 걸러주지 못하므로 시작만으로 판정한다
    const r = eventSchema.safeParse({
      ...VALID,
      booking_start: "2026-08-02T10:00",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["booking_start"]);

    // 종료 일시가 있으면 그 시각 이전까지 허용 — 스테이지 진행 중 오픈은 막지 않는다
    expect(
      eventSchema.safeParse({
        ...VALID,
        event_end_date: "2026-08-01T22:00",
        booking_start: "2026-08-01T20:00",
      }).success,
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

  it("select 필드는 보기가 모두 채워져야 한다", () => {
    const withOptions = (options: string[]) =>
      eventSchema.safeParse({
        ...VALID,
        custom_fields: [
          { id: "f1", label: "연령대", type: "select", required: true, options },
        ],
      });

    expect(withOptions(["10대", "20대"]).success).toBe(true);
    // 편집기가 빈 보기 한 칸으로 시작하므로 그대로 저장되는 것을 막는다
    expect(withOptions([""]).success).toBe(false);
    expect(withOptions(["10대", "  "]).success).toBe(false);
    expect(withOptions([]).success).toBe(false);

    const r = withOptions([""]);
    expect(r.error?.issues[0]?.message).toBe(
      "선택 필드의 보기를 모두 입력해 주세요.",
    );
  });
});
