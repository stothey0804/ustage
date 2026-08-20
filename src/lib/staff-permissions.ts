/**
 * 스테이지 권한 매트릭스 (순수 함수 — 서버·클라이언트 공용).
 *
 * 역할은 **소유자와 스태프 2종**이다. 스태프는 소규모 공연의 지인 1~2명을 전제로 하며,
 * 현장 운영(입장·입금·추첨)은 맡기고 **파괴적·금전적 변경은 소유자에게 남긴다.**
 *
 * 모든 서버 액션·API가 이 함수를 단일 관문으로 지나므로, 여기 매트릭스가 곧 차단 규칙이다.
 * DB에서도 파괴적 동작(예매 삭제·이벤트 CUD·추첨 초기화)은 RLS로 한 번 더 막는다.
 */

export type EventRole = "owner" | "staff";

export type EventCapability =
  // 스태프 허용 — 현장 운영
  | "view_bookings"
  | "check_in"
  | "confirm_payment"
  | "cancel_booking"
  | "onsite_booking"
  | "resend_confirmation"
  | "reset_booking_password"
  | "run_draw"
  | "export_csv"
  // 소유자 전용 — 파괴적이거나 금전·정책에 관한 것
  | "reset_draws"
  | "delete_booking"
  | "edit_event"
  | "change_event_status"
  | "delete_event"
  | "manage_staff";

const STAFF_ALLOWED: ReadonlySet<EventCapability> = new Set([
  "view_bookings",
  "check_in",
  "confirm_payment",
  "cancel_booking",
  "onsite_booking",
  "resend_confirmation",
  "reset_booking_password",
  "run_draw",
  // CSV는 명단 열람 권한과 기술적으로 분리되지 않는다(이미 로드된 목록으로 만든다).
  // 열람을 허용하면서 내보내기만 막는 것은 실질 보호가 아니므로 함께 허용한다.
  "export_csv",
]);

export function canPerform(
  role: EventRole,
  capability: EventCapability
): boolean {
  if (role === "owner") return true;
  return STAFF_ALLOWED.has(capability);
}

/** 스태프에게 감출 UI를 한 번에 판단할 때 쓴다. */
export function isOwner(role: EventRole): boolean {
  return role === "owner";
}

export type StaffInvite = {
  status: string;
  expires_at: string;
  user_id: string | null;
  /** 초대가 걸린 스테이지의 소유자 */
  ownerId: string;
};

export type InviteAcceptance =
  | { ok: true; alreadyAccepted?: boolean }
  | { ok: false; reason: string };

/**
 * 초대 수락 가능 여부. 서버 액션이 DB 갱신 전에 이 판정을 지난다.
 * 순수 함수로 둬서 만료·중복 수락·자기 스테이지 같은 경계를 테스트로 못 박는다.
 */
export function validateInviteAcceptance(
  invite: StaffInvite | null,
  userId: string,
  now: Date = new Date()
): InviteAcceptance {
  if (!invite) {
    return { ok: false, reason: "초대를 찾을 수 없습니다. 링크를 다시 확인해 주세요." };
  }
  if (invite.ownerId === userId) {
    return {
      ok: false,
      reason: "본인이 만든 스테이지에는 스태프로 참여할 수 없습니다.",
    };
  }
  if (invite.status === "accepted") {
    // 같은 계정의 재방문은 오류가 아니다 — 수락 직후 로그아웃했다가 메일 링크로
    // 다시 들어오는 흐름(가입 인증 → 재로그인)에서 반드시 발생한다. 멱등 처리.
    return invite.user_id === userId
      ? { ok: true, alreadyAccepted: true }
      : { ok: false, reason: "이미 사용된 초대입니다." };
  }
  if (invite.status !== "pending") {
    return { ok: false, reason: "사용할 수 없는 초대입니다." };
  }
  const expires = new Date(invite.expires_at).getTime();
  if (!isNaN(expires) && expires <= now.getTime()) {
    return {
      ok: false,
      reason: "초대가 만료되었습니다. 주최자에게 다시 초대를 요청해 주세요.",
    };
  }
  return { ok: true };
}

/** 명단 상세에서 역할에 따라 보일 액션 (컴포넌트 테스트용으로 분리) */
export function visibleBookingActions(role: EventRole): {
  canDelete: boolean;
  canResetPassword: boolean;
  canCancel: boolean;
} {
  return {
    canDelete: canPerform(role, "delete_booking"),
    canResetPassword: canPerform(role, "reset_booking_password"),
    canCancel: canPerform(role, "cancel_booking"),
  };
}
