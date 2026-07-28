import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { needsEmailSetup } from "@/lib/account-email";

/**
 * 인증 콜백 — 이메일 확인 링크와 OAuth(카카오) 로그인이 공유한다.
 * Supabase가 `?code=...`로 리다이렉트하면 code를 세션으로 교환한 뒤 이동한다.
 * 카카오처럼 제공자가 이메일을 주지 않는 경우 계정 이메일이 비어 있으므로
 * /onboarding/email로 보내 사용할 주소를 입력받는다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Open redirect 방지: 내부 경로만 허용.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (error) {
    console.error("[auth/callback] error", error, errorDescription);
    const failUrl = new URL("/login", origin);
    failUrl.searchParams.set("error", errorDescription ?? error);
    return NextResponse.redirect(failUrl);
  }

  const supabase = await createClient();

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

  // 이메일이 없는 계정(카카오 등) — 사용할 주소를 먼저 받는다.
  if (needsEmailSetup(data.user)) {
    const onboarding = new URL("/onboarding/email", origin);
    onboarding.searchParams.set("next", safeNext);
    return NextResponse.redirect(onboarding);
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
