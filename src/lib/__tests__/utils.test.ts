import { describe, expect, it } from "vitest";
import { cn, safeInternalPath } from "@/lib/utils";

describe("safeInternalPath", () => {
  it("내부 절대경로는 그대로 허용한다", () => {
    expect(safeInternalPath("/dashboard/bookings")).toBe("/dashboard/bookings");
    expect(safeInternalPath("/")).toBe("/");
    expect(safeInternalPath("/e/abc123?x=1")).toBe("/e/abc123?x=1");
  });

  it("값이 없으면 fallback을 반환한다", () => {
    expect(safeInternalPath(undefined)).toBe("/dashboard");
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
  });

  it("외부 URL은 차단한다", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/dashboard");
    expect(safeInternalPath("http://evil.com/x")).toBe("/dashboard");
  });

  it("프로토콜 상대 경로(//host)를 차단한다", () => {
    expect(safeInternalPath("//evil.com")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com/path")).toBe("/dashboard");
  });

  it("백슬래시 우회(/\\host)를 차단한다", () => {
    expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
  });

  it("커스텀 fallback을 지원한다", () => {
    expect(safeInternalPath("https://evil.com", "/login")).toBe("/login");
  });
});

describe("cn", () => {
  it("충돌하는 Tailwind 클래스는 뒤의 것이 이긴다", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("조건부 클래스를 병합한다", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
