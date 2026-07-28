import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import {
  KAKAO_COOKIE,
  KAKAO_TOKEN_URL,
  getKakaoConfig,
  timingSafeEqual,
} from "@/lib/kakao";
import { needsEmailSetup } from "@/lib/account-email";
import { safeInternalPath } from "@/lib/utils";

type KakaoTokenResponse = {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

/**
 * 카카오 인가 콜백.
 * code를 토큰으로 교환해 id_token을 받고, signInWithIdToken으로 Supabase 세션을 만든다.
 * 카카오에서 이메일을 받지 않으므로 신규 계정은 /onboarding/email로 보낸다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();

  const clearTempCookies = () => {
    cookieStore.delete(KAKAO_COOKIE.state);
    cookieStore.delete(KAKAO_COOKIE.nonce);
    cookieStore.delete(KAKAO_COOKIE.next);
  };

  const fail = (message: string) => {
    clearTempCookies();
    const url = new URL("/login", origin);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  };

  const error = searchParams.get("error");
  if (error) {
    // 사용자가 동의 화면에서 취소한 경우도 여기로 온다.
    console.error(
      "[auth/kakao] authorize error",
      error,
      searchParams.get("error_description"),
    );
    return fail("카카오 로그인이 완료되지 않았습니다. 다시 시도해 주세요.");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = cookieStore.get(KAKAO_COOKIE.state)?.value;
  const nonce = cookieStore.get(KAKAO_COOKIE.nonce)?.value;
  const next = safeInternalPath(cookieStore.get(KAKAO_COOKIE.next)?.value);

  if (!code || !state || !expectedState || !timingSafeEqual(state, expectedState)) {
    console.error("[auth/kakao] state 불일치 또는 code 누락");
    return fail("인증 정보가 만료되었습니다. 다시 시도해 주세요.");
  }

  const config = getKakaoConfig();
  if (!config) {
    console.error("[auth/kakao] KAKAO_REST_API_KEY 미설정");
    return fail("카카오 로그인이 아직 설정되지 않았습니다.");
  }

  // 인가 코드 → 토큰 (client_secret은 카카오 콘솔에서 '사용함'일 때만 전송)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: `${origin}/api/auth/kakao/callback`,
    code,
  });
  if (config.clientSecret) body.set("client_secret", config.clientSecret);

  let token: KakaoTokenResponse;
  try {
    const tokenRes = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body,
      cache: "no-store",
    });
    token = (await tokenRes.json()) as KakaoTokenResponse;
    if (!tokenRes.ok || !token.id_token) {
      console.error("[auth/kakao] token exchange failed", tokenRes.status, token);
      return fail(
        "카카오 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  } catch (err) {
    console.error("[auth/kakao] token exchange error", err);
    return fail("카카오 인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithIdToken({
    provider: "kakao",
    token: token.id_token,
    // id_token에 at_hash가 있으면 access_token으로 검증되고, 없으면 무시된다.
    access_token: token.access_token,
    nonce,
  });

  if (signInError || !data.user) {
    console.error("[auth/kakao] signInWithIdToken", signInError);
    return fail("로그인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  clearTempCookies();

  // 카카오는 이메일을 주지 않으므로 신규 계정은 이메일 등록을 먼저 받는다.
  const target = needsEmailSetup(data.user)
    ? `/onboarding/email?next=${encodeURIComponent(next)}`
    : next;

  return NextResponse.redirect(new URL(target, origin));
}
