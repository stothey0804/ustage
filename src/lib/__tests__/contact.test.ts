import { describe, expect, it } from "vitest";
import { contactHref } from "../contact";

describe("contactHref", () => {
  it("URL은 그대로 링크한다", () => {
    expect(contactHref("https://open.kakao.com/o/abc")).toBe("https://open.kakao.com/o/abc");
  });
  it("문장 속 URL을 찾는다", () => {
    expect(contactHref("오픈카톡: https://open.kakao.com/o/abc 로 문의")).toBe(
      "https://open.kakao.com/o/abc"
    );
  });
  it("스킴 없는 오픈카톡 주소에 https를 붙인다", () => {
    expect(contactHref("open.kakao.com/o/abc")).toBe("https://open.kakao.com/o/abc");
  });
  it("전화번호는 tel: 링크", () => {
    expect(contactHref("010-1234-5678")).toBe("tel:01012345678");
    expect(contactHref("문의 02 123 4567")).toBe("tel:021234567");
    expect(contactHref("+82 10-1234-5678")).toBe("tel:+821012345678");
  });
  it("이메일은 mailto: 링크", () => {
    expect(contactHref("help@ustage.im")).toBe("mailto:help@ustage.im");
  });
  it("링크로 만들 수 없으면 null", () => {
    expect(contactHref("인스타 DM 주세요")).toBeNull();
    expect(contactHref("2026")).toBeNull();
    expect(contactHref("")).toBeNull();
  });
});
