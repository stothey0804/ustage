/**
 * OAuth(카카오) 로그인으로 들어온 계정을 어떻게 처리할지 결정한다.
 *
 * **계정의 기준은 이메일이다.** 이메일+비밀번호로 가입한 계정만 정식 계정으로 보고,
 * 카카오는 그 계정에 붙이는 **로그인 수단**으로만 취급한다. 카카오 로그인만으로
 * 계정이 생기면 다음 문제가 따라온다(실제로 겪었다):
 *   - Supabase가 email identity를 만들어 주지 않아 카카오 연결을 해제할 수 없다
 *     (`single_identity_not_deletable` — 로그인 수단이 하나뿐이므로).
 *   - 계정 이메일이 카카오 주소로 고정되고, 앱에서는 바꿀 수 없다.
 *
 * 그래서 email identity가 없는 계정은 **가입 화면으로 되돌린다.** 단, 이미 데이터가
 * 있는 계정(스테이지·예매·스태프)은 지우면 안 되므로 그대로 통과시킨다.
 */

export type OAuthAccountDecision =
  /** 정상 진행 — 정식 계정이거나, 데이터가 있어 손대면 안 되는 기존 계정 */
  | { kind: "allow" }
  /** 계정을 정리하고 이메일 가입으로 안내 */
  | { kind: "signup"; email: string | null };

export function decideOAuthAccount(input: {
  /** 이 계정에 연결된 provider 목록 */
  providers: string[];
  /** 계정 이메일 (카카오가 주지 않았으면 null) */
  email: string | null;
  /** 스테이지·예매·스태프 등 지우면 안 되는 데이터가 있는가 */
  hasData: boolean;
}): OAuthAccountDecision {
  // 이메일로 가입한 계정 — 카카오는 로그인 수단으로 붙은 것이니 정상이다.
  if (input.providers.includes("email")) return { kind: "allow" };

  // 데이터가 있는 계정은 삭제할 수 없다. 기존 사용자를 내보내는 쪽이 더 나쁘다.
  if (input.hasData) return { kind: "allow" };

  return { kind: "signup", email: input.email?.trim().toLowerCase() || null };
}

/**
 * 카카오 로그인이 "이미 그 이메일로 가입된 계정이 있어" 실패했는지 판단한다.
 * gotrue가 상황에 따라 다른 문구를 주므로 키워드로 판단하고, 아니면 원문을 보여준다.
 */
export function isEmailConflictError(description: string | null): boolean {
  if (!description) return false;
  return /already|exists|in use|conflict/i.test(description);
}
