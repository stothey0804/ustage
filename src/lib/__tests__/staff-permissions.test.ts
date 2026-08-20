import { describe, expect, it } from "vitest";
import {
  canPerform,
  isOwner,
  validateInviteAcceptance,
  visibleBookingActions,
  type EventCapability,
} from "@/lib/staff-permissions";

const STAFF_ALLOWED: EventCapability[] = [
  "view_bookings",
  "check_in",
  "confirm_payment",
  "cancel_booking",
  "onsite_booking",
  "resend_confirmation",
  "reset_booking_password",
  "run_draw",
  "export_csv",
];

const OWNER_ONLY: EventCapability[] = [
  "reset_draws",
  "delete_booking",
  "edit_event",
  "change_event_status",
  "delete_event",
  "manage_staff",
];

describe("canPerform", () => {
  it("소유자는 모든 동작을 할 수 있다", () => {
    for (const cap of [...STAFF_ALLOWED, ...OWNER_ONLY]) {
      expect(canPerform("owner", cap)).toBe(true);
    }
  });

  it("스태프는 현장 운영 동작을 할 수 있다", () => {
    for (const cap of STAFF_ALLOWED) {
      expect(canPerform("staff", cap)).toBe(true);
    }
  });

  it("스태프는 파괴적·금전적 동작을 할 수 없다", () => {
    for (const cap of OWNER_ONLY) {
      expect(canPerform("staff", cap)).toBe(false);
    }
  });

  it("isOwner는 역할만 본다", () => {
    expect(isOwner("owner")).toBe(true);
    expect(isOwner("staff")).toBe(false);
  });
});

describe("visibleBookingActions", () => {
  it("스태프에게는 삭제만 감춘다", () => {
    expect(visibleBookingActions("staff")).toEqual({
      canDelete: false,
      canResetPassword: true,
      canCancel: true,
    });
  });

  it("소유자는 전부 보인다", () => {
    expect(visibleBookingActions("owner")).toEqual({
      canDelete: true,
      canResetPassword: true,
      canCancel: true,
    });
  });
});

describe("validateInviteAcceptance", () => {
  const NOW = new Date("2026-07-31T00:00:00Z");
  const base = {
    status: "pending",
    expires_at: "2026-08-05T00:00:00Z",
    user_id: null,
    ownerId: "owner-1",
  };

  it("유효한 초대는 수락된다", () => {
    expect(validateInviteAcceptance(base, "user-2", NOW)).toEqual({ ok: true });
  });

  it("초대가 없으면 거절한다", () => {
    const result = validateInviteAcceptance(null, "user-2", NOW);
    expect(result.ok).toBe(false);
  });

  it("자기 스테이지에는 스태프로 참여할 수 없다", () => {
    const result = validateInviteAcceptance(base, "owner-1", NOW);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toContain("본인이 만든");
  });

  it("만료된 초대는 거절한다", () => {
    const result = validateInviteAcceptance(
      { ...base, expires_at: "2026-07-30T23:59:00Z" },
      "user-2",
      NOW,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toContain("만료");
  });

  it("이미 다른 계정이 수락한 초대는 거절한다", () => {
    const result = validateInviteAcceptance(
      { ...base, status: "accepted", user_id: "user-9" },
      "user-2",
      NOW,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toContain("이미 사용된");
  });

  it("본인이 이미 수락한 초대의 재방문은 성공이다 (멱등)", () => {
    // 수락 → 로그아웃 → 메일 링크로 재진입(재로그인) 흐름에서 반드시 발생한다.
    // 오류 화면을 보여주면 사용자는 수락이 실패했다고 오해한다.
    const result = validateInviteAcceptance(
      { ...base, status: "accepted", user_id: "user-2" },
      "user-2",
      NOW,
    );
    expect(result).toEqual({ ok: true, alreadyAccepted: true });
  });
});
