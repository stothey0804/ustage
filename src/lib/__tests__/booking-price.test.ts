import { describe, expect, it } from "vitest";

import {
  bookingAmount,
  bookingUnitPrice,
  isFreeStage,
} from "@/lib/booking-price";

describe("bookingUnitPrice", () => {
  it("예매에 적힌 단가를 그대로 쓴다", () => {
    expect(bookingUnitPrice({ unit_price: 15000 }, 10000)).toBe(15000);
  });

  it("0원 단가는 무료로 인정한다 (스테이지 가격으로 되돌아가지 않는다)", () => {
    // 온라인 유료 + 현장 무료 조합에서 현장 예매가 유료로 잘못 계산되던 경우
    expect(bookingUnitPrice({ unit_price: 0 }, 10000)).toBe(0);
  });

  it("단가가 없으면 스테이지 온라인 가격으로 되돌아간다", () => {
    expect(bookingUnitPrice({ unit_price: null }, 10000)).toBe(10000);
    expect(bookingUnitPrice({}, 10000)).toBe(10000);
    expect(bookingUnitPrice(null, 10000)).toBe(10000);
  });

  it("음수 단가는 신뢰하지 않는다", () => {
    expect(bookingUnitPrice({ unit_price: -1 }, 10000)).toBe(10000);
  });
});

describe("bookingAmount", () => {
  it("단가 × 유효 매수", () => {
    expect(bookingAmount({ unit_price: 15000 }, 10000, 2)).toBe(30000);
  });

  it("부분 취소로 유효 매수가 줄면 금액도 줄어든다", () => {
    expect(bookingAmount({ unit_price: 15000 }, 10000, 1)).toBe(15000);
  });
});

describe("isFreeStage", () => {
  it("온라인·현장 모두 0원이어야 무료다", () => {
    expect(isFreeStage(0, null)).toBe(true);
    expect(isFreeStage(0, 0)).toBe(true);
  });

  it("현장만 유료여도 무료가 아니다 — 입금 확인 흐름이 필요하다", () => {
    expect(isFreeStage(0, 15000)).toBe(false);
  });

  it("온라인이 유료면 무료가 아니다", () => {
    expect(isFreeStage(10000, null)).toBe(false);
    expect(isFreeStage(10000, 0)).toBe(false);
  });
});
