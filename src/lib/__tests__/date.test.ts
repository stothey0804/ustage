import { describe, expect, it } from "vitest";
import { formatDepositTime, formatKST } from "@/lib/date";

// package.json의 test 스크립트가 TZ=UTC로 고정 — formatKST는 UTC 서버 가정이다.

describe("formatDepositTime", () => {
  it('datetime-local 값("YYYY-MM-DDTHH:mm")을 한국어로 포맷한다', () => {
    expect(formatDepositTime("2026-07-15T19:30")).toBe("7월 15일 (수) 19:30");
  });

  it("파싱할 수 없는 자유 입력은 그대로 반환한다 (하위호환)", () => {
    expect(formatDepositTime("무료입장")).toBe("무료입장");
    expect(formatDepositTime("오후 7시쯤")).toBe("오후 7시쯤");
    expect(formatDepositTime("")).toBe("");
  });
});

describe("formatKST", () => {
  it("UTC 저장값을 KST 벽시계 시각으로 표시한다", () => {
    // 10:00 KST == 01:00 UTC
    expect(formatKST("2026-07-15T01:00:00Z")).toBe(
      "2026년 7월 15일 (수) 10:00",
    );
  });

  it("타임존 오프셋이 있는 값도 같은 순간으로 표시한다", () => {
    expect(formatKST("2026-07-15T10:00:00+09:00")).toBe(
      "2026년 7월 15일 (수) 10:00",
    );
  });

  it("커스텀 포맷을 지원한다", () => {
    expect(formatKST("2026-07-15T01:00:00Z", "M.d HH:mm")).toBe("7.15 10:00");
  });

  it("파싱 불가한 문자열은 그대로 반환한다", () => {
    expect(formatKST("not-a-date")).toBe("not-a-date");
  });
});
