/**
 * 카카오 OAuth에 요청할 동의항목(scope).
 *
 * Supabase(gotrue)의 카카오 provider 기본값은
 * `account_email,profile_image,profile_nickname`이다. 그런데 `account_email`은
 * 카카오 앱에서 동의항목을 켜야(=비즈 앱 전환 필요) 요청할 수 있고, 켜지 않은 상태로
 * 요청하면 카카오가 "설정하지 않은 카카오 로그인 동의 항목을 포함해 인가 코드를
 * 요청했습니다"로 거절한다.
 *
 * 어스테이지는 이메일을 카카오에서 받지 않고 /onboarding/email에서 직접 입력받으므로
 * 닉네임만 요청한다. gotrue는 scopes 파라미터가 오면 기본값을 **대체**한다.
 * 나중에 비즈 앱 전환 후 이메일까지 받으려면 여기에 `account_email`을 추가하면 되고,
 * 사용자가 선택 동의를 거부한 경우에도 온보딩 화면이 그대로 대비책이 된다.
 */
export const KAKAO_SCOPES = "profile_nickname";
