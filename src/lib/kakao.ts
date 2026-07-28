/**
 * 카카오 OAuth에 요청할 동의항목(scope).
 *
 * Supabase(gotrue)의 카카오 provider는 scope를 **항상** 보낸다. 클라이언트가
 * `scopes`를 주지 않으면 기본값 `account_email,profile_image,profile_nickname`을
 * 그대로 사용하고, 주면 그 값으로 대체한다(auth-js는 값이 있을 때만 파라미터를 붙임).
 * 즉 "아무것도 요청하지 않기"는 이 경로에서 불가능하고, 카카오는 앱에 설정되지 않은
 * 항목이 섞이면 "설정하지 않은 카카오 로그인 동의 항목" 오류로 인가를 거절한다.
 *
 * 어스테이지는
 *  - 이메일: /onboarding/email에서 직접 입력받는다 → `account_email` 요청하지 않음
 *  - 프로필 사진: 쓰지 않는다 → `profile_image` 요청하지 않음
 * 따라서 로그인 식별에 필요한 닉네임 하나만 요청한다. 닉네임은 gotrue가
 * user_metadata에 넣어두기만 하고 앱에서 저장·표시하지 않는다.
 *
 * 카카오 콘솔(제품 설정 → 카카오 로그인 → 동의항목)에서 여기 적힌 항목이
 * '필수 동의' 또는 '선택 동의'로 켜져 있어야 한다.
 */
export const KAKAO_SCOPES = "profile_nickname";
