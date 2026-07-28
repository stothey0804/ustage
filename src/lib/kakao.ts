/**
 * 카카오 OAuth에 요청할 동의항목(scope).
 *
 * ⚠️ 실측 확인(인가 URL 기준): gotrue는 기본 scope
 * `account_email,profile_image,profile_nickname`을 **항상** 붙이고, 여기서 넘긴 값은
 * 그 뒤에 **덧붙는다**(대체가 아니다). 실제로 `scope=account_email profile_image
 * profile_nickname profile_nickname`이 나갔다. 따라서 이 상수로는 요청 항목을 줄일 수
 * 없다 — 값을 비워도 기본값 3개가 그대로 나간다.
 *
 * 그러므로 Supabase provider 경유 로그인을 쓰려면 카카오 콘솔
 * (제품 설정 → 카카오 로그인 → 동의항목)에서 **세 항목을 모두 켜야** 하고,
 * `account_email`은 **비즈 앱 전환**이 전제다. 켜지 않으면 카카오가
 * "설정하지 않은 카카오 로그인 동의 항목" 오류로 인가를 거절한다.
 * 이메일을 받게 되더라도 사용자가 '선택 동의'를 거부하면 이메일이 비어 오므로
 * /onboarding/email 흐름은 그대로 대비책으로 남는다.
 *
 * 동의항목을 하나도 켜지 않고 로그인시키려면 Supabase provider를 우회해
 * 카카오 OIDC(scope=openid) + signInWithIdToken을 직접 구현해야 한다.
 * 해당 구현은 커밋 0f16ddb에 있고 8f9a5d1에서 되돌렸다.
 */
export const KAKAO_SCOPES = "profile_nickname";
