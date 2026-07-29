"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertEventAccess } from "@/lib/event-access";
import { validateInviteAcceptance } from "@/lib/staff-permissions";
import { staffInviteSchema } from "@/lib/validations/staff";
import { sendStaffInvite, getBaseUrl } from "@/lib/email";
import { formatKST } from "@/lib/date";
import { checkRateLimit } from "@/lib/rate-limit";

type Result = { error?: string; success?: boolean };

/** 스테이지 하나에 둘 수 있는 스태프(초대 포함) 상한 */
const MAX_STAFF_PER_EVENT = 10;

/**
 * 스태프 초대 — 이메일로 초대 링크를 보낸다.
 *
 * 가입 여부를 조회하지 않고 **항상 같은 응답**을 준다: 소유자에게 "이 이메일이
 * 가입돼 있는지"를 알려주면 계정 열거(enumeration)가 되기 때문이다.
 * 미가입자도 링크를 누르면 로그인·가입(카카오면 이메일 등록까지)을 거쳐 수락된다.
 * 수락 시 연결되는 것은 그 세션의 auth.uid()이므로, 신뢰 경계가 아닌
 * user_metadata.contact_email로 계정을 매칭하는 위험을 피한다.
 */
export async function inviteEventStaff(
  eventId: string,
  email: string
): Promise<Result> {
  const parsed = staffInviteSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "이메일을 확인해 주세요." };
  }

  const access = await assertEventAccess(eventId, "manage_staff");
  if ("error" in access) return { error: access.error };

  const invitedEmail = parsed.data.email;

  // 초대 남발·이메일 대량 발송 방지
  const allowed = await checkRateLimit(`staff-invite:${access.userId}`, 10, 3600);
  if (!allowed) {
    return { error: "초대를 너무 많이 보냈습니다. 잠시 후 다시 시도해 주세요." };
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from("event_staff")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if ((count ?? 0) >= MAX_STAFF_PER_EVENT) {
    return {
      error: `스태프는 스테이지당 최대 ${MAX_STAFF_PER_EVENT}명까지 둘 수 있습니다.`,
    };
  }

  // 같은 이메일을 다시 초대하면 토큰·만료를 새로 발급한다(재발송과 동일 효과).
  const { data: existing } = await admin
    .from("event_staff")
    .select("id, status")
    .eq("event_id", eventId)
    .ilike("invited_email", invitedEmail)
    .maybeSingle();

  if (existing?.status === "accepted") {
    return { error: "이미 이 스테이지의 스태프입니다." };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let token: string | null = null;

  if (existing) {
    const { data, error } = await admin
      .from("event_staff")
      .update({
        expires_at: expiresAt,
        invited_at: new Date().toISOString(),
        invite_token: crypto.randomUUID(),
      })
      .eq("id", existing.id)
      .select("invite_token")
      .single();
    if (error) {
      console.error("[inviteEventStaff] update", error);
      return { error: "초대에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }
    token = data.invite_token;
  } else {
    const { data, error } = await admin
      .from("event_staff")
      .insert({
        event_id: eventId,
        invited_email: invitedEmail,
        expires_at: expiresAt,
      })
      .select("invite_token")
      .single();
    if (error) {
      console.error("[inviteEventStaff] insert", error);
      return { error: "초대에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }
    token = data.invite_token;
  }

  const acceptUrl = `${getBaseUrl()}/dashboard/staff/accept/${token}`;
  const event = access.event;

  after(() =>
    sendStaffInvite({
      to: invitedEmail,
      eventTitle: event.title,
      eventDate: formatKST(event.event_date),
      eventVenue: event.venue_address || event.venue,
      acceptUrl,
    }).catch((err) => console.error("[email]", err))
  );

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true };
}

/** 초대 재발송 — 토큰과 만료를 새로 발급한다. */
export async function resendStaffInvite(staffId: string): Promise<Result> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("event_staff")
    .select("id, event_id, invited_email, status")
    .eq("id", staffId)
    .single();

  if (!row) return { error: "초대를 찾을 수 없습니다." };
  if (row.status === "accepted") return { error: "이미 수락된 초대입니다." };

  const access = await assertEventAccess(row.event_id, "manage_staff");
  if ("error" in access) return { error: access.error };

  return inviteEventStaff(row.event_id, row.invited_email);
}

/** 스태프 제거 — 대기 중인 초대와 참여 중인 스태프 모두 여기서 지운다. */
export async function removeEventStaff(staffId: string): Promise<Result> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("event_staff")
    .select("id, event_id")
    .eq("id", staffId)
    .single();

  if (!row) return { error: "대상을 찾을 수 없습니다." };

  const access = await assertEventAccess(row.event_id, "manage_staff");
  if ("error" in access) return { error: access.error };

  const { error } = await admin.from("event_staff").delete().eq("id", staffId);
  if (error) {
    console.error("[removeEventStaff]", error);
    return { error: "제거에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${row.event_id}`);
  return { success: true };
}

/** 초대 수락 — 링크를 누른 **그 세션의 계정**을 스태프로 연결한다. */
export async function acceptStaffInvite(token: string): Promise<
  Result & { eventId?: string; eventTitle?: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("event_staff")
    .select(
      "id, event_id, status, expires_at, user_id, events!inner(title, performer_id)"
    )
    .eq("invite_token", token)
    .maybeSingle();

  const event = invite?.events as
    | { title: string; performer_id: string }
    | undefined;

  const verdict = validateInviteAcceptance(
    invite && event
      ? {
          status: invite.status,
          expires_at: invite.expires_at,
          user_id: invite.user_id,
          ownerId: event.performer_id,
        }
      : null,
    user.id
  );

  if (!verdict.ok) return { error: verdict.reason };

  // pending 조건부 갱신 — 같은 링크로 두 계정이 동시에 수락하는 것을 막는다
  const { data: updated, error } = await admin
    .from("event_staff")
    .update({
      user_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite!.id)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("[acceptStaffInvite]", error);
    return { error: "수락 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!updated || updated.length === 0) {
    return { error: "이미 사용된 초대입니다." };
  }

  revalidatePath("/dashboard/events");
  return {
    success: true,
    eventId: invite!.event_id,
    eventTitle: event!.title,
  };
}

/** 스태프가 스스로 그만두기 */
export async function leaveEventStaff(eventId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_staff")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[leaveEventStaff]", error);
    return { error: "처리에 실패했습니다." };
  }

  revalidatePath("/dashboard/events");
  return { success: true };
}
