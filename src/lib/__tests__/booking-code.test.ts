import { describe, expect, it } from "vitest";
import {
  bookingCode,
  formatBookingNo,
  matchesBookingCode,
  matchesBookingNo,
} from "@/lib/booking-code";

const ID = "3b241101-e2bb-4255-8caf-4136c566a962";

describe("bookingCode", () => {
  it("uuid 앞 6자를 대문자 코드로 만든다", () => {
    expect(bookingCode(ID)).toBe("BK-3B2411");
  });
});

describe("formatBookingNo", () => {
  it("순번이 있으면 #N", () => {
    expect(formatBookingNo(7, ID)).toBe("#7");
    expect(formatBookingNo(128, ID)).toBe("#128");
  });

  it("순번이 없으면(마이그레이션 미적용) uuid 파생 코드로 폴백", () => {
    expect(formatBookingNo(null, ID)).toBe("BK-3B2411");
    expect(formatBookingNo(undefined, ID)).toBe("BK-3B2411");
  });
});

describe("matchesBookingNo", () => {
  it("#12, 12 모두 순번과 매칭된다", () => {
    expect(matchesBookingNo(12, ID, "#12")).toBe(true);
    expect(matchesBookingNo(12, ID, "12")).toBe(true);
    expect(matchesBookingNo(12, ID, " 12 ")).toBe(true);
  });

  it("부분 숫자도 매칭된다", () => {
    expect(matchesBookingNo(128, ID, "12")).toBe(true);
  });

  it("다른 번호는 매칭되지 않는다", () => {
    expect(matchesBookingNo(12, ID, "99")).toBe(false);
  });

  it("구형 BK 코드로도 찾을 수 있다", () => {
    expect(matchesBookingNo(12, ID, "BK-3B2411")).toBe(true);
    expect(matchesBookingNo(null, ID, "3B2411")).toBe(true);
  });

  it("빈 검색어는 매칭되지 않는다", () => {
    expect(matchesBookingNo(12, ID, "")).toBe(false);
    expect(matchesBookingCode(ID, "")).toBe(false);
  });
});
