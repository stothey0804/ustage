import { describe, expect, it } from "vitest";
import { resolveBookingIdentity } from "@/lib/booking-inherit";

const original = {
  name: "홍길동",
  custom_answers: { f1: "20대" } as Record<string, string>,
};

describe("resolveBookingIdentity", () => {
  it("예매 폼 경로: 이번에 입력한 이름·답변을 쓴다", () => {
    // 별도 예약이므로 동반자 정보 등 다른 답변이 정상이다
    const r = resolveBookingIdentity({
      submittedName: "김영희",
      submittedAnswers: { f1: "30대" },
      original,
    });
    expect(r.name).toBe("김영희");
    expect(r.customAnswers).toEqual({ f1: "30대" });
  });

  it("조회 화면 경로: 보낸 값이 없으면 기존 예약에서 상속한다", () => {
    const r = resolveBookingIdentity({
      submittedName: "",
      submittedAnswers: {},
      original,
    });
    expect(r.name).toBe("홍길동");
    expect(r.customAnswers).toEqual({ f1: "20대" });
  });

  it("이름과 답변은 각각 판단한다 (한쪽만 보낸 경우)", () => {
    expect(
      resolveBookingIdentity({
        submittedName: "   ",
        submittedAnswers: { f1: "30대" },
        original,
      }),
    ).toEqual({ name: "홍길동", customAnswers: { f1: "30대" } });

    expect(
      resolveBookingIdentity({
        submittedName: "김영희",
        submittedAnswers: {},
        original,
      }),
    ).toEqual({ name: "김영희", customAnswers: { f1: "20대" } });
  });

  it("신규 예매(상속 대상 없음)는 제출값만 쓴다", () => {
    const r = resolveBookingIdentity({
      submittedName: "박철수",
      submittedAnswers: {},
      original: null,
    });
    expect(r.name).toBe("박철수");
    // 답변이 없으면 null — 빈 객체를 저장하지 않는다
    expect(r.customAnswers).toBeNull();
  });
});
