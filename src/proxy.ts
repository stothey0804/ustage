import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { needsEmailSetup } from "@/lib/account-email";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // /dashboard 이하는 공연자 로그인 필요.
  if (pathname.startsWith("/dashboard") && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // 세션 갱신으로 세팅된 쿠키를 redirect 응답에도 전파.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // 카카오처럼 이메일 없는 계정은 주소를 먼저 등록해야 대시보드를 쓸 수 있다.
  // (인증 링크 클릭은 강제하지 않는다 — 등록만 하면 통과, 미인증은 배너로 안내)
  if (
    pathname.startsWith("/dashboard") &&
    needsEmailSetup(user) &&
    !pathname.startsWith("/onboarding")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/onboarding/email";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // 이미 로그인한 사용자가 /login, /signup 접근 시 대시보드로.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 정적 에셋과 이미지 최적화 경로는 제외.
     * 나머지는 세션 쿠키 갱신을 위해 모두 통과.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
