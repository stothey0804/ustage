import { describe, expect, it } from "vitest";
import { onsiteBookingSchema } from "@/lib/validations/booking";

const base = {
  name: "홍길동",
  email: "hong@example.com",
  quantity: 1,
  confirmNow: true,
};

describe("onsiteBookingSchema — 커스텀 답변", () => {
  it("답변을 함께 받는다", () => {
    const r = onsiteBookingSchema.safeParse({
      ...base,
      custom_answers: { f1: "20대" },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.custom_answers).toEqual({ f1: "20대" });
  });

  it("손대지 않은 필드(값 undefined)를 통과시킨다", () => {
    // select·checkbox는 Controller가 등록만 하고 값이 없는 상태로 시작한다
    expect(
      onsiteBookingSchema.safeParse({
        ...base,
        custom_answers: { f1: undefined },
      }).success,
    ).toBe(true);
  });

  it("답변이 없어도 통과한다 (필수 검사는 서버 액션이 한다)", () => {
    expect(onsiteBookingSchema.safeParse(base).success).toBe(true);
  });

  it("매수 상한 20매는 그대로 유지된다", () => {
    expect(onsiteBookingSchema.safeParse({ ...base, quantity: 21 }).success).toBe(
      false,
    );
  });
});
