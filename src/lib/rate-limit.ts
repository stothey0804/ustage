import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 고정 윈도우 rate limit (Supabase hit_rate_limit RPC 기반).
 * true = 허용, false = 한도 초과.
 * RPC 미적용·일시 오류 시에는 차단하지 않는다(fail-open) — 인프라 문제로
 * 예매·조회가 막히는 것보다 잠시 무제한이 낫다는 판단.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient();
  // database.ts 재생성 전까지 RPC 타입 부재 — 이 지점에서만 우회 캐스팅
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;

  const { data, error } = await rpc("hit_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    if (error.code === "PGRST202") {
      console.warn(
        "[rate-limit] hit_rate_limit RPC가 없어 제한 없이 통과시킵니다. " +
          "supabase/migrations/20260707130000_rate_limit.sql을 적용하세요."
      );
    } else {
      console.error("[rate-limit]", error);
    }
    return true;
  }

  return data === true;
}

/**
 * 프록시(Vercel 등) 뒤에서의 클라이언트 IP. 알 수 없으면 "unknown"으로 묶임.
 *
 * 신뢰 프록시가 직접 세팅하는 헤더를 우선한다:
 *   1) x-vercel-forwarded-for — Vercel이 실제 접속 IP로 세팅(클라이언트 조작 불가)
 *   2) x-real-ip             — 다른 리버스 프록시(nginx 등)가 세팅
 * `x-forwarded-for`는 클라이언트가 임의 값을 앞에 붙일 수 있어(스푸핑) 최후순위로 두고,
 * 프록시가 append 하는 특성상 **최우측**(신뢰 홉이 기록한 값)을 사용한다.
 * 최좌측을 쓰면 공격자가 헤더를 위조해 IP 단위 rate limit을 우회할 수 있다.
 */
export function getClientIp(req: Request): string {
  const trusted =
    req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (trusted) return trusted.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}
