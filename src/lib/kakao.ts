/**
 * 카카오 로그인 — OIDC 직연동.
 *
 * Supabase의 카카오 provider(`signInWithOAuth({provider:'kakao'})`)는 쓰지 않는다.
 * gotrue가 `account_email,profile_image,profile_nickname`을 **항상** scope에 붙이고
 * (클라이언트가 준 scopes는 대체가 아니라 뒤에 덧붙는다), `account_email`은 카카오
 * 비즈 앱 전환 없이는 요청할 수 없어 인가 단계에서 거절된다.
 *
 * 그래서 인가·토큰 교환을 우리 라우트(/api/auth/kakao/*)에서 직접 처리하고,
 * scope는 `openid` 하나만 요청한다 — 닉네임·프로필 사진·이메일 모두 수집하지 않고
 * 카카오 사용자 식별자(id_token의 sub)만 받는다. 이메일은 /onboarding/email에서
 * 직접 입력받는다.
 *
 * 받은 id_token은 `supabase.auth.signInWithIdToken({ provider: 'kakao' })`로 넘겨
 * Supabase 세션을 만든다. Supabase 대시보드의 Kakao provider는 **활성화된 상태로
 * 두어야 하고**, 거기 등록한 Client ID가 아래 KAKAO_REST_API_KEY와 같아야 한다
 * (gotrue가 id_token의 aud를 그 값으로 검증한다).
 *
 * 카카오 콘솔 요구사항:
 *  - 제품 설정 → 카카오 로그인 → OpenID Connect **활성화**
 *  - Redirect URI에 `<origin>/api/auth/kakao/callback` 등록 (localhost·운영 도메인 각각)
 *  - 동의항목은 하나도 켜지 않아도 된다
 */

export const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
export const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

/** id_token만 받기 위한 최소 scope. 개인정보 동의항목은 요청하지 않는다. */
export const KAKAO_OIDC_SCOPE = "openid";

/** state·nonce·복귀 경로를 담는 임시 쿠키 (인가 왕복 동안만 유지) */
export const KAKAO_COOKIE = {
  state: "kakao_oauth_state",
  nonce: "kakao_oauth_nonce",
  next: "kakao_oauth_next",
} as const;

export const KAKAO_COOKIE_MAX_AGE = 10 * 60;

export type KakaoConfig = {
  clientId: string;
  /** 카카오 콘솔에서 Client Secret을 '사용함'으로 설정한 경우에만 필요 */
  clientSecret?: string;
};

/** 환경변수 미설정 시 null — 라우트에서 사용자에게 안내하고 중단한다. */
export function getKakaoConfig(): KakaoConfig | null {
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) return null;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  return { clientId, clientSecret: clientSecret || undefined };
}

/** state·nonce용 난수 (CSRF·리플레이 방지) */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 길이가 달라도 시간차가 새지 않도록 고정 시간 비교 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
