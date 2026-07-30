import { describe, expect, it } from "vitest";

import {
  decideOAuthAccount,
  isEmailConflictError,
} from "@/lib/oauth-account";

describe("decideOAuthAccount", () => {
  it("이메일로 가입한 계정에 카카오가 붙은 것은 통과시킨다", () => {
    expect(
      decideOAuthAccount({
        providers: ["email", "kakao"],
        email: "user@example.com",
        hasData: false,
      }),
    ).toEqual({ kind: "allow" });
  });

  it("카카오만 연결된 새 계정은 이메일 가입으로 보낸다", () => {
    expect(
      decideOAuthAccount({
        providers: ["kakao"],
        email: "User@Kakao.com",
        hasData: false,
      }),
    ).toEqual({ kind: "signup", email: "user@kakao.com" });
  });

  it("카카오가 이메일을 주지 않았어도 가입으로 보낸다 (자동완성만 비운다)", () => {
    expect(
      decideOAuthAccount({ providers: ["kakao"], email: null, hasData: false }),
    ).toEqual({ kind: "signup", email: null });
  });

  it("데이터가 있는 카카오 전용 계정은 지우지 않고 통과시킨다", () => {
    expect(
      decideOAuthAccount({
        providers: ["kakao"],
        email: "host@kakao.com",
        hasData: true,
      }),
    ).toEqual({ kind: "allow" });
  });

  it("빈 문자열 이메일은 null로 정규화한다", () => {
    expect(
      decideOAuthAccount({ providers: ["kakao"], email: "  ", hasData: false }),
    ).toEqual({ kind: "signup", email: null });
  });
});

describe("isEmailConflictError", () => {
  it("이미 가입된 이메일을 가리키는 문구를 알아낸다", () => {
    expect(isEmailConflictError("Email address already in use")).toBe(true);
    expect(isEmailConflictError("identity already exists")).toBe(true);
  });

  it("관련 없는 오류는 그대로 둔다", () => {
    expect(isEmailConflictError("invalid request")).toBe(false);
    expect(isEmailConflictError(null)).toBe(false);
  });
});
