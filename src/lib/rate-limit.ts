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

/** 프록시(Vercel 등) 뒤에서의 클라이언트 IP. 알 수 없으면 "unknown"으로 묶임. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
