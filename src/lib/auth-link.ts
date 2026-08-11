/**
 * 메일 링크(가입 인증·비밀번호 재설정·이메일 변경) 실패 사유를 사용자 문구로 바꾼다.
 * gotrue가 돌려주는 code/description은 영문이라 그대로 노출하면 원인도, 다음 행동도 알 수 없다.
 * 순수 함수로 둬서 문구를 테스트로 못 박는다.
 */
export function describeAuthLinkError(input: {
  code?: string | null;
  description?: string | null;
}): string {
  const code = (input.code ?? "").toLowerCase();
  const description = (input.description ?? "").toLowerCase();
  const has = (needle: string) =>
    code.includes(needle) || description.includes(needle);

  // 일회용 링크가 이미 소비됐거나 유효기간이 지난 경우 — 가장 흔하다.
  // 메일 앱·보안 스캐너가 링크를 먼저 열어 토큰을 소비하는 경우도 여기로 들어온다.
  if (has("expired") || has("otp_expired") || has("invalid or has expired")) {
    return "인증 링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 받아 주세요.";
  }

  if (has("token") && has("not found")) {
    return "인증 링크가 유효하지 않습니다. 인증 메일을 다시 받아 주세요.";
  }

  if (has("access_denied")) {
    return "인증이 취소되었거나 링크가 더 이상 유효하지 않습니다. 다시 시도해 주세요.";
  }

  return "인증에 실패했습니다. 인증 메일을 다시 받아 주세요.";
}

/** 메일 링크로 들어올 수 있는 OTP 종류 — 그 외 값은 신뢰하지 않는다. */
const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

export type EmailLinkOtpType = (typeof EMAIL_OTP_TYPES)[number];

/** 쿼리로 들어온 type이 메일 링크 OTP 종류인지 확인한다. */
export function isEmailLinkOtpType(
  value: string | null
): value is EmailLinkOtpType {
  return (
    value != null && (EMAIL_OTP_TYPES as readonly string[]).includes(value)
  );
}

/** 내부 경로만 허용 — `//host`로 시작하는 open redirect를 막는다. */
function isSafePath(value: string | null | undefined): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

/**
 * 콜백 이후 이동할 내부 경로를 정한다.
 * 메일 템플릿은 `{{ .SiteURL }}/auth/callback?…&redirect_to={{ .RedirectTo }}` 형태라
 * 목적지가 `redirect_to`(앱이 넘긴 emailRedirectTo) 안에 한 겹 들어 있다.
 * 우선순위: 최상위 next → redirect_to의 next → /dashboard.
 */
export function resolveSafeNext(
  params: { next?: string | null; redirectTo?: string | null },
  origin: string
): string {
  if (isSafePath(params.next)) return params.next;

  if (params.redirectTo) {
    try {
      const url = new URL(params.redirectTo, origin);
      // 같은 오리진의 주소만 신뢰한다
      if (url.origin === new URL(origin).origin) {
        const nested = url.searchParams.get("next");
        if (isSafePath(nested)) return nested;
      }
    } catch {
      // 파싱 불가 — 기본 경로로 보낸다
    }
  }

  return "/dashboard";
}
