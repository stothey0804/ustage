import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 이메일 확인 링크 처리.
 * Supabase가 `?code=...`로 리다이렉트하면 code를 세션으로 교환한 뒤 /admin으로 이동.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[auth/callback] error", error, errorDescription);
    const failUrl = new URL("/login", origin);
    failUrl.searchParams.set("error", errorDescription ?? error);
    return NextResponse.redirect(failUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchange error", exchangeError);
    const failUrl = new URL("/login", origin);
    failUrl.searchParams.set("error", "인증에 실패했습니다. 다시 시도해 주세요.");
    return NextResponse.redirect(failUrl);
  }

  // Open redirect 방지: 내부 경로만 허용.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  return NextResponse.redirect(new URL(safeNext, origin));
}
