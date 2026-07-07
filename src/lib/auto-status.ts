import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventStatusFields = Pick<EventRow, "status" | "event_date" | "booking_end">;

/**
 * 저장된 상태 + 현재 시각만으로 전환돼야 할 상태를 계산 (부수효과 없음).
 * - open + booking_end 경과 → closed (예매 마감)
 * - open/closed + event_date 경과 → ended (행사 종료)
 * 전환이 필요 없으면 null.
 */
export function deriveAutoStatus(
  event: EventStatusFields
): "closed" | "ended" | null {
  if (event.status !== "open" && event.status !== "closed") return null;

  const now = new Date();

  if (event.event_date && new Date(event.event_date) < now) {
    return "ended";
  }
  if (
    event.status === "open" &&
    event.booking_end &&
    new Date(event.booking_end) < now
  ) {
    return "closed";
  }
  return null;
}

/**
 * 이벤트 상태를 조건에 따라 자동 전환 (lazy evaluation).
 * 갱신은 service_role로 수행 — 공개 페이지(익명 방문자 세션)에서 호출하면
 * RLS에 막혀 0-row 업데이트로 조용히 무시되는 문제를 피하기 위함.
 * 조건은 서버에서 계산한 값이므로 권한 상승 위험 없음.
 * 변경된 상태를 반환. 변경 없으면 null.
 */
export async function autoTransitionStatus(
  event: Pick<EventRow, "id"> & EventStatusFields
): Promise<string | null> {
  const newStatus = deriveAutoStatus(event);
  if (!newStatus) return null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ status: newStatus })
    .eq("id", event.id)
    .eq("status", event.status as string); // 경합 시 다른 전환(수동 마감 등)을 덮어쓰지 않도록

  if (error) {
    console.error("[autoTransitionStatus]", error);
    return null;
  }

  return newStatus;
}
