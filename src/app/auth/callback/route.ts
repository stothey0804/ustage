import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsEmailSetup } from "@/lib/account-email";
import {
  decideOAuthAccount,
  isEmailConflictError,
} from "@/lib/oauth-account";

/** 지우면 안 되는 데이터가 있는 계정인지 — 스테이지·예매·스태프 참여 */
async function hasAccountData(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const [events, bookings, staff] = await Promise.all([
    admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("performer_id", userId),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("event_staff")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  // 조회가 실패하면 "있다"고 본다 — 판단이 안 될 때 계정을 지우는 쪽이 훨씬 나쁘다.
  if (events.error || bookings.error || staff.error) {
    console.error("[auth/callback] hasAccountData", {
      events: events.error,
      bookings: bookings.error,
      staff: staff.error,
    });
    return true;
  }

  return (events.count ?? 0) + (bookings.count ?? 0) + (staff.count ?? 0) > 0;
}

/**
 * 카카오만으로 만들어진 계정을 정리하고 이메일 가입으로 돌려보낸다.
 * 계정을 남겨두면 그 이메일로 가입이 막혀(이미 사용 중) 가입 자체가 불가능해진다.
 */
async function sendToSignup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  email: string | null,
  origin: string,
  safeNext: string
): Promise<NextResponse> {
  // 세션 쿠키를 먼저 정리한 뒤 계정을 삭제한다.
  await supabase.auth.signOut();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[auth/callback] delete oauth-only user", error);
  }

  const signup = new URL("/signup", origin);
  if (email) signup.searchParams.set("email", email);
  signup.searchParams.set("from", "kakao");
  if (safeNext !== "/dashboard") signup.searchParams.set("next", safeNext);
  return NextResponse.redirect(signup);
}

/**
 * 인증 콜백 — 이메일 확인 링크와 OAuth(카카오) 로그인이 공유한다.
 * Supabase가 `?code=...`로 리다이렉트하면 code를 세션으로 교환한 뒤 이동한다.
 *
 * **계정의 기준은 이메일이다.** 카카오 로그인으로 계정이 새로 생겼다면(= email
 * identity가 없다면) 그대로 들여보내지 않고 이메일 가입으로 안내한다
 * (`lib/oauth-account.ts` 참고). 이미 데이터가 있는 계정은 예외로 통과시킨다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Open redirect 방지: 내부 경로만 허용.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();

  if (error) {
    console.error("[auth/callback] error", error, errorDescription);
    // 같은 이메일로 이미 가입돼 있어 카카오 연결이 거절된 경우 — 다음 행동을 알려준다.
    const message = isEmailConflictError(errorDescription)
      ? "이미 이 이메일로 가입된 계정이 있어요. 이메일+비밀번호로 로그인한 뒤 계정 설정에서 카카오를 연결해 주세요."
      : (errorDescription ?? error);
    // 계정 연결(linkIdentity)처럼 이미 로그인한 상태에서 온 실패는
    // /login으로 보내면 원인을 볼 수 없다 — 출발한 화면으로 에러를 들고 돌아간다.
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    const failUrl = current
      ? new URL(safeNext, origin)
      : new URL("/login", origin);
    failUrl.searchParams.set("error", message);
    return NextResponse.redirect(failUrl);
  }

  if (!code) {
    // 이메일 변경 확인처럼 Supabase가 서버에서 검증을 끝내고 code 없이 돌아오는 경우가 있다.
    // 이미 세션이 있으면 그대로 목적지로 보낸다.
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    if (current) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchange error", exchangeError);
    const failUrl = new URL("/login", origin);
    failUrl.searchParams.set("error", "인증에 실패했습니다. 다시 시도해 주세요.");
    return NextResponse.redirect(failUrl);
  }

  // 카카오만으로 만들어진 계정인지 판정 — 이메일 가입이 계정의 기준이다.
  const providers = (data.user.identities ?? []).map((i) => i.provider);
  const decision = decideOAuthAccount({
    providers,
    email: data.user.email ?? null,
    hasData: providers.includes("email")
      ? false // 정식 계정이면 조회할 필요가 없다
      : await hasAccountData(data.user.id),
  });

  if (decision.kind === "signup") {
    return sendToSignup(supabase, data.user, decision.email, origin, safeNext);
  }

  // 이메일이 없는 계정(카카오 등) — 사용할 주소를 먼저 받는다.
  if (needsEmailSetup(data.user)) {
    const onboarding = new URL("/onboarding/email", origin);
    onboarding.searchParams.set("next", safeNext);
    return NextResponse.redirect(onboarding);
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
