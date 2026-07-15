import { describe, expect, it } from "vitest";
import {
  bookingApiSchema,
  bookingFormSchema,
} from "@/lib/validations/booking";

const VALID_API = {
  event_id: "3b241101-e2bb-4255-8caf-4136c566a962",
  name: "홍길동",
  email: "hong@example.com",
  quantity: 2,
};

describe("bookingApiSchema", () => {
  it("유효한 입력을 통과시키고 기본값을 채운다", () => {
    const r = bookingApiSchema.safeParse(VALID_API);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.additional).toBe(false);
      expect(r.data.depositor_name).toBe("");
      expect(r.data.deposited_at).toBe("");
    }
  });

  it("event_id는 UUID여야 한다", () => {
    const r = bookingApiSchema.safeParse({ ...VALID_API, event_id: "abc" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("올바른 스테이지 ID가 아닙니다.");
  });

  it("이메일 형식을 검증한다", () => {
    expect(
      bookingApiSchema.safeParse({ ...VALID_API, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      bookingApiSchema.safeParse({ ...VALID_API, email: "" }).success,
    ).toBe(false);
  });

  it("매수는 1~20 정수만 허용한다", () => {
    expect(bookingApiSchema.safeParse({ ...VALID_API, quantity: 0 }).success).toBe(false);
    expect(bookingApiSchema.safeParse({ ...VALID_API, quantity: 21 }).success).toBe(false);
    expect(bookingApiSchema.safeParse({ ...VALID_API, quantity: 1.5 }).success).toBe(false);
    expect(bookingApiSchema.safeParse({ ...VALID_API, quantity: 20 }).success).toBe(true);
  });

  it("custom_answers는 문자열/숫자/불리언 값을 허용한다", () => {
    expect(
      bookingApiSchema.safeParse({
        ...VALID_API,
        custom_answers: { f1: "답변", f2: 3, f3: true },
      }).success,
    ).toBe(true);
    expect(
      bookingApiSchema.safeParse({
        ...VALID_API,
        custom_answers: { f1: { nested: 1 } },
      }).success,
    ).toBe(false);
  });
});

describe("bookingFormSchema", () => {
  const VALID_FORM = {
    name: "홍길동",
    email: "hong@example.com",
    depositor_name: "",
    deposited_at: "",
    quantity: 1,
  };

  it("유효한 폼 입력을 통과시킨다", () => {
    expect(bookingFormSchema.safeParse(VALID_FORM).success).toBe(true);
  });

  it("이름은 필수", () => {
    const r = bookingFormSchema.safeParse({ ...VALID_FORM, name: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("이름을 입력해 주세요.");
  });

  it("입금자명/입금시간은 스키마 레벨에서는 선택 (유료 여부에 따라 제출 시 검증)", () => {
    expect(
      bookingFormSchema.safeParse({
        ...VALID_FORM,
        depositor_name: "",
        deposited_at: "",
      }).success,
    ).toBe(true);
  });
});
