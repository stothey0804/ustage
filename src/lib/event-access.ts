import { createClient } from "@/lib/supabase/server";
import {
  canPerform,
  type EventCapability,
  type EventRole,
} from "@/lib/staff-permissions";

/**
 * 스테이지 접근 관문 — 서버 액션·API가 공유한다.
 *
 * "로그인했는가 → 소유자인가 스태프인가 → 이 동작이 허용되는가"를 한 번에 판정한다.
 * 모든 관리 동작이 이 함수를 지나므로 권한 규칙이 한 곳에만 존재한다.
 * (RLS도 같은 경계를 걸어 두지만, 동작 단위 허용은 여기서 결정한다.)
 */

type EventRow = {
  id: string;
  title: string;
  slug: string;
  price: number;
  /** 현장 예매 1매 가격 — null이면 price와 동일 */
  onsite_price: number | null;
  bank_info: string;
  event_date: string;
  venue: string;
  venue_address: string | null;
  performer_id: string;
  /** 현장 예매의 필수 항목 검사용 */
  custom_fields: unknown;
  /** 현장 예매의 좌석 상한 표시용 */
  capacity: number | null;
};

export type EventAccess = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  role: EventRole;
  event: EventRow;
};

const NO_ACCESS = "스테이지를 찾을 수 없거나 권한이 없습니다.";

/** 소유자/스태프 여부만 판정 — 권한(capability) 검사는 하지 않는다. */
async function resolveRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
): Promise<{ role: EventRole; event: EventRow } | null> {
  // events SELECT는 공개 정책이라 performer_id 필터 없이 조회할 수 있다.
  const { data: event } = await supabase
    .from("events")
    .select(
      // custom_fields·capacity는 현장 예매(주최자 대행)에서 필수 항목·좌석을 검사하는 데 쓴다
      "id, title, slug, price, onsite_price, bank_info, event_date, venue, venue_address, performer_id, custom_fields, capacity"
    )
    .eq("id", eventId)
    .single();

  if (!event) return null;

  if (event.performer_id === userId) return { role: "owner", event };

  // 스태프는 자기 행만 읽을 수 있다(event_staff_select_self 정책).
  const { data: staff } = await supabase
    .from("event_staff")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  return staff ? { role: "staff", event } : null;
}

export async function assertEventAccess(
  eventId: string,
  capability: EventCapability
): Promise<EventAccess | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const resolved = await resolveRole(supabase, eventId, user.id);
  if (!resolved) return { error: NO_ACCESS };

  if (!canPerform(resolved.role, capability)) {
    return { error: "이 작업은 스테이지 소유자만 할 수 있습니다." };
  }

  return {
    supabase,
    userId: user.id,
    role: resolved.role,
    event: resolved.event,
  };
}

export type BookingAccess = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  role: EventRole;
  eventId: string;
};

export async function assertBookingAccess(
  bookingId: string,
  capability: EventCapability
): Promise<BookingAccess | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "권한이 없습니다." };

  const resolved = await resolveRole(supabase, booking.event_id, user.id);
  if (!resolved) return { error: "권한이 없습니다." };

  if (!canPerform(resolved.role, capability)) {
    return { error: "이 작업은 스테이지 소유자만 할 수 있습니다." };
  }

  return {
    supabase,
    userId: user.id,
    role: resolved.role,
    eventId: booking.event_id,
  };
}

/** 내가 스태프로 참여한(수락 완료) 스테이지 id 목록 */
export async function myStaffEventIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("event_staff")
    .select("event_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  return (data ?? []).map((row) => row.event_id);
}
