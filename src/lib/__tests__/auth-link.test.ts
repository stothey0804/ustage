import { describe, expect, it } from "vitest";
import {
  describeAuthLinkError,
  isEmailLinkOtpType,
  resolveSafeNext,
} from "@/lib/auth-link";

const ORIGIN = "https://privateustage.com";

describe("describeAuthLinkError", () => {
  it("만료·재사용된 링크는 다시 받으라고 안내한다", () => {
    const expected =
      "인증 링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 받아 주세요.";
    expect(describeAuthLinkError({ code: "otp_expired" })).toBe(expected);
    expect(
      describeAuthLinkError({
        code: "access_denied",
        description: "Email link is invalid or has expired",
      }),
    ).toBe(expected);
  });

  it("취소된 인증은 재시도를 안내한다", () => {
    expect(describeAuthLinkError({ code: "access_denied" })).toBe(
      "인증이 취소되었거나 링크가 더 이상 유효하지 않습니다. 다시 시도해 주세요.",
    );
  });

  it("알 수 없는 사유도 영문을 그대로 노출하지 않는다", () => {
    const msg = describeAuthLinkError({
      code: "unexpected_failure",
      description: "Database error saving new user",
    });
    expect(msg).toBe("인증에 실패했습니다. 인증 메일을 다시 받아 주세요.");
    expect(msg).not.toContain("Database");
  });
});

describe("isEmailLinkOtpType", () => {
  it("메일 링크 OTP 종류만 통과시킨다", () => {
    for (const t of ["signup", "recovery", "email_change", "email", "invite", "magiclink"]) {
      expect(isEmailLinkOtpType(t)).toBe(true);
    }
    expect(isEmailLinkOtpType("sms")).toBe(false);
    expect(isEmailLinkOtpType(null)).toBe(false);
    expect(isEmailLinkOtpType("")).toBe(false);
  });
});

describe("resolveSafeNext", () => {
  it("최상위 next를 먼저 쓴다", () => {
    expect(resolveSafeNext({ next: "/dashboard/events" }, ORIGIN)).toBe(
      "/dashboard/events",
    );
  });

  it("메일 템플릿이 넘긴 redirect_to 안의 next를 꺼낸다", () => {
    // 템플릿: {{ .SiteURL }}/auth/callback?token_hash=…&redirect_to={{ .RedirectTo }}
    expect(
      resolveSafeNext(
        {
          redirectTo: `${ORIGIN}/auth/callback?next=${encodeURIComponent("/onboarding/link-kakao?next=/dashboard")}`,
        },
        ORIGIN,
      ),
    ).toBe("/onboarding/link-kakao?next=/dashboard");
  });

  it("next가 없으면 기본 경로로 보낸다", () => {
    expect(resolveSafeNext({}, ORIGIN)).toBe("/dashboard");
    expect(
      resolveSafeNext({ redirectTo: `${ORIGIN}/auth/callback` }, ORIGIN),
    ).toBe("/dashboard");
  });

  it("외부 주소로는 보내지 않는다 (open redirect 방지)", () => {
    expect(resolveSafeNext({ next: "https://evil.example" }, ORIGIN)).toBe(
      "/dashboard",
    );
    expect(resolveSafeNext({ next: "//evil.example" }, ORIGIN)).toBe(
      "/dashboard",
    );
    // 다른 오리진의 redirect_to는 신뢰하지 않는다
    expect(
      resolveSafeNext(
        { redirectTo: "https://evil.example/auth/callback?next=/dashboard/account" },
        ORIGIN,
      ),
    ).toBe("/dashboard");
    expect(resolveSafeNext({ redirectTo: "not a url" }, ORIGIN)).toBe(
      "/dashboard",
    );
  });
});
