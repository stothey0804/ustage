import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Supabase 세션 쿠키를 갱신한다. Next 16 proxy에서 호출되는 헬퍼.
 *
 * 반환된 supabaseResponse를 그대로 proxy에서 반환하거나,
 * redirect 시 동일한 쿠키를 복사한 응답으로 갈아끼워야 한다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // 검증된 사용자 정보를 Auth 서버에서 조회 (getSession은 authorization에 부적합).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
