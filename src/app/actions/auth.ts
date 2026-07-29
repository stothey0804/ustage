"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] sign out error", error);
  }
  redirect("/");
}

/**
 * 비밀번호 재설정 메일 요청.
 *
 * **가입된 계정 이메일에만 보낸다.** Supabase 기본 동작은 미가입 주소에도
 * 성공을 반환해(계정 열거 방지) "보냈다"고 안내하게 되는데, 실제로는 아무 메일도
 * 오지 않아 사용자가 스팸함만 뒤지게 된다. 그래서 존재 여부를 먼저 확인하고
 * 없으면 그 사실을 알려준다 — 열거 위험은 rate limit으로 낮춘다.
 *
 * 계정 이메일만 인정한다. user_metadata.contact_email은 사용자가 수정할 수 있어
 * 소유 증명이 필요한 재설정에는 쓸 수 없다(카카오 미인증 주소가 여기 해당).
 */
export async function requestPasswordReset(
  email: string
): Promise<{ error?: string; sent?: boolean }> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "이메일을 확인해 주세요." };
  }

  const target = parsed.data.email.trim().toLowerCase();
  const ip = getClientIp(new Request("http://local", { headers: await headers() }));

  // 주소를 바꿔가며 가입 여부를 훑는 것을 막는다 (IP 기준이 더 촘촘하다)
  const ipAllowed = await checkRateLimit(`pw-reset-ip:${ip}`, 10, 600);
  if (!ipAllowed) {
    return { error: "요청이 너무 많습니다. 10분 후 다시 시도해 주세요." };
  }
  const emailAllowed = await checkRateLimit(`pw-reset:${target}`, 5, 900);
  if (!emailAllowed) {
    return { error: "재설정 메일을 너무 많이 요청했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const admin = createAdminClient();
  // database.ts 재생성 전까지 RPC 타입 부재 — 이 지점에서만 우회 캐스팅
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;

  const { data: exists, error: rpcError } = await rpc("account_email_exists", {
    p_email: target,
  });

  // 함수가 아직 적용되지 않은 환경에서는 재설정 자체를 막지 않는다(fail-open).
  // Supabase 기본 동작으로 되돌아가는 것이라 최악이라도 예전과 같다.
  const rpcMissing = rpcError?.code === "PGRST202";
  if (rpcMissing) {
    console.warn(
      "[requestPasswordReset] account_email_exists RPC가 없어 가입 확인을 건너뜁니다. " +
        "supabase/migrations/20260801100000_account_email_exists.sql을 적용하세요."
    );
  } else if (rpcError) {
    console.error("[requestPasswordReset] rpc", rpcError);
    return { error: "확인에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (!rpcMissing && exists !== true) {
    return {
      error:
        "가입된 계정이 없는 주소입니다. 카카오로 가입했다면 카카오 버튼으로 로그인해 주세요.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(target, {
    redirectTo: `${getBaseUrl()}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("[requestPasswordReset] send", error);
    return { error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  return { sent: true };
}

/**
 * 회원 탈퇴 — 계정을 삭제한다. 되돌릴 수 없다.
 *
 * 정리 규칙:
 *  - 예매 이력(취소분 포함)이 있는 스테이지가 남아 있으면 **차단**한다.
 *    주최자가 없어진 스테이지는 입금 확인·입장 처리를 할 사람이 없어지므로,
 *    참석자가 있는 스테이지는 먼저 정리하도록 안내한다.
 *  - 예매가 없는 내 스테이지는 함께 삭제하고 포스터 파일도 지운다.
 *  - 내가 참석자로 넣은 예약은 **삭제하지 않고 user_id만 끊는다.**
 *    주최자의 예매 명단·정산 기록을 훼손하지 않기 위해서다. (bookings.user_id에
 *    cascade 삭제가 걸려 있어도 미리 끊어두면 기록이 남는다.)
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();

  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, poster_url")
    .eq("performer_id", user.id);

  if (eventsError) {
    console.error("[deleteAccount] events lookup", eventsError);
    return { error: "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const eventIds = (events ?? []).map((e) => e.id);

  if (eventIds.length > 0) {
    const { count, error: countError } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds);

    if (countError) {
      console.error("[deleteAccount] bookings count", countError);
      return { error: "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
    }

    if ((count ?? 0) > 0) {
      return {
        error:
          "예매 내역이 있는 스테이지가 남아 있어 탈퇴할 수 없습니다. 해당 스테이지의 예매를 정리한 뒤 다시 시도해 주세요.",
      };
    }

    const { error: deleteEventsError } = await admin
      .from("events")
      .delete()
      .eq("performer_id", user.id);

    if (deleteEventsError) {
      console.error("[deleteAccount] events delete", deleteEventsError);
      return { error: "스테이지 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    // 포스터 파일 정리 — 실패해도 탈퇴는 계속한다(고아 파일만 남음)
    const paths = (events ?? [])
      .map((e) => {
        if (!e.poster_url) return null;
        const marker = "/object/public/posters/";
        const idx = e.poster_url.indexOf(marker);
        if (idx === -1) return null;
        try {
          return decodeURIComponent(e.poster_url.slice(idx + marker.length));
        } catch {
          return null;
        }
      })
      .filter((p): p is string => !!p);

    if (paths.length > 0) {
      const { error: storageError } = await admin.storage
        .from("posters")
        .remove(paths);
      if (storageError) {
        console.error("[deleteAccount] poster cleanup", storageError);
      }
    }
  }

  // 참석자로서의 예약은 기록을 남기고 계정 연결만 끊는다.
  const { error: unlinkError } = await admin
    .from("bookings")
    .update({ user_id: null })
    .eq("user_id", user.id);

  if (unlinkError) {
    console.error("[deleteAccount] bookings unlink", unlinkError);
    return { error: "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    console.error("[deleteAccount] deleteUser", deleteUserError);
    return { error: "계정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 계정이 사라졌으므로 남은 세션 쿠키를 정리한다(오류는 무시).
  await supabase.auth.signOut().catch(() => undefined);

  redirect("/");
}
