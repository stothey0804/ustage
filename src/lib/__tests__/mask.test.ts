import { describe, expect, it } from "vitest";
import { maskEmail, maskName } from "@/lib/mask";

describe("maskName", () => {
  it("가운데를 가린다", () => {
    expect(maskName("김수")).toBe("김*");
    expect(maskName("김수영")).toBe("김*영");
    expect(maskName("남궁민수")).toBe("남**수");
    expect(maskName("김수영입니다")).toBe("김****다");
  });

  it("1자 이름은 전체를 가린다", () => {
    expect(maskName("김")).toBe("*");
  });

  it("영문 이름도 같은 규칙", () => {
    expect(maskName("Jo")).toBe("J*");
    expect(maskName("Alice")).toBe("A***e");
  });

  it("빈 값·공백은 물음표", () => {
    expect(maskName("")).toBe("?");
    expect(maskName("   ")).toBe("?");
  });

  it("앞뒤 공백은 무시한다", () => {
    expect(maskName("  김수영  ")).toBe("김*영");
  });
});

describe("maskEmail", () => {
  it("로컬파트 앞 4문자만 남기고 도메인은 유지한다", () => {
    expect(maskEmail("seyoung.kim@ustage.im")).toBe("seyo***@ustage.im");
    expect(maskEmail("abcde@a.com")).toBe("abcd***@a.com");
  });

  it("로컬파트가 4자 이하면 첫 글자만 남긴다 (전체 노출 방지)", () => {
    expect(maskEmail("abcd@naver.com")).toBe("a***@naver.com");
    expect(maskEmail("ab@naver.com")).toBe("a***@naver.com");
    expect(maskEmail("a@naver.com")).toBe("a***@naver.com");
  });

  it("@가 여러 번 나오면 마지막 @를 도메인 경계로 본다", () => {
    expect(maskEmail("a@b@ustage.im")).toBe("a***@ustage.im");
  });

  it("@가 없으면 전체를 로컬파트로 본다", () => {
    expect(maskEmail("seyoungkim")).toBe("seyo***");
    expect(maskEmail("abc")).toBe("a***");
  });

  it("빈 값은 물음표", () => {
    expect(maskEmail("")).toBe("?");
  });
});
