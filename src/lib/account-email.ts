/**
 * 카카오 등 OAuth 로그인은 제공자가 이메일을 주지 않을 수 있어 Supabase 계정
 * 이메일(auth.users.email)이 비어 있는 상태로 만들어진다.
 * 온보딩(/onboarding/email)에서 입력받은 주소를
 *   ① updateUser({ email })로 계정 이메일 변경(= 인증 메일 발송)
 *   ② user_metadata.contact_email에 복사
 * 두 곳에 넣기 때문에, 인증 완료 전에도 앱은 ②를 사용해 동작한다.
 *
 * user_metadata는 사용자가 스스로 수정할 수 있으므로 **신뢰 경계가 아니다**.
 * 소유 증명이 필요한 용도(로그인·비밀번호 재설정)에는 계정 이메일만 쓴다.
 */

type MaybeUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

function metadataEmail(user: MaybeUser): string | null {
  const value = user?.user_metadata?.contact_email;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** 앱에서 사용할 이메일 — 계정 이메일 우선, 없으면 온보딩에서 입력한 주소. */
export function getAccountEmail(user: MaybeUser): string | null {
  const email = user?.email?.trim();
  if (email) return email;
  return metadataEmail(user);
}

/** 이메일을 아직 한 번도 받지 못한 계정 — 온보딩으로 보내야 한다. */
export function needsEmailSetup(user: MaybeUser): boolean {
  if (!user) return false;
  return !user.email && !metadataEmail(user);
}

/** 주소는 입력했지만 인증 링크 클릭이 남은 상태 — 배너로 안내한다. */
export function isEmailPendingVerification(user: MaybeUser): boolean {
  if (!user) return false;
  return !user.email && !!metadataEmail(user);
}
