import { describe, expect, it } from "vitest";
import { bookingFormSchema } from "@/lib/validations/booking";

const base = {
  name: "홍길동",
  email: "hong@example.com",
  depositor_name: "홍길동",
  deposited_at: "",
  quantity: 1,
};

describe("bookingFormSchema — 커스텀 답변", () => {
  it("손대지 않은 커스텀 필드(값 undefined)를 통과시킨다", () => {
    // select·checkbox는 Controller가 등록만 하고 값이 없는 상태로 시작한다.
    // 여기서 막으면 zod 기본 문구가 필드 아래에 그대로 노출된다
    // (필수 검사는 RHF 룰과 서버가 한다).
    const r = bookingFormSchema.safeParse({
      ...base,
      custom_answers: { f1: undefined, f2: "20대" },
    });
    expect(r.success).toBe(true);
  });

  it("값이 문자열이면 그대로 통과한다", () => {
    expect(
      bookingFormSchema.safeParse({ ...base, custom_answers: { f1: "true" } })
        .success,
    ).toBe(true);
  });

  it("남은 검증 실패 문구는 한국어다", () => {
    const r = bookingFormSchema.safeParse({ ...base, email: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("이메일을 입력해 주세요.");

    // message를 적지 않은 검증(타입 불일치)도 zod 한국어 로케일로 나온다.
    // 타입 이름(string/number)은 그대로 남지만 문장은 한국어여야 한다.
    const t = bookingFormSchema.safeParse({ ...base, name: 123 });
    expect(t.success).toBe(false);
    const msg = t.error?.issues[0]?.message ?? "";
    expect(msg).not.toContain("Invalid input");
    expect(msg).toMatch(/잘못된 입력/);
  });
});
