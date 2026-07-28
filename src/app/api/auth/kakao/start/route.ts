import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  KAKAO_AUTHORIZE_URL,
  KAKAO_COOKIE,
  KAKAO_COOKIE_MAX_AGE,
  KAKAO_OIDC_SCOPE,
  getKakaoConfig,
  randomToken,
} from "@/lib/kakao";
import { safeInternalPath } from "@/lib/utils";

/**
 * 카카오 인가 요청 시작.
 * state·nonce를 httpOnly 쿠키에 저장하고 카카오 인가 화면으로 보낸다.
 * scope는 `openid` 하나뿐 — 동의항목(이메일·닉네임·사진)은 요청하지 않는다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"));

  const config = getKakaoConfig();
  if (!config) {
    console.error("[auth/kakao] KAKAO_REST_API_KEY 미설정");
    const fail = new URL("/login", origin);
    fail.searchParams.set(
      "error",
      "카카오 로그인이 아직 설정되지 않았습니다. 이메일로 로그인해 주세요.",
    );
    return NextResponse.redirect(fail);
  }

  const state = randomToken();
  const nonce = randomToken();

  const authorize = new URL(KAKAO_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set(
    "redirect_uri",
    `${origin}/api/auth/kakao/callback`,
  );
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", KAKAO_OIDC_SCOPE);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("nonce", nonce);

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: KAKAO_COOKIE_MAX_AGE,
  };
  cookieStore.set(KAKAO_COOKIE.state, state, options);
  cookieStore.set(KAKAO_COOKIE.nonce, nonce, options);
  cookieStore.set(KAKAO_COOKIE.next, next, options);

  return NextResponse.redirect(authorize);
}
