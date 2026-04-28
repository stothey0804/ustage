import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Event = Database["public"]["Tables"]["events"]["Row"];

/**
 * 이벤트 상태를 조건에 따라 자동 전환 (lazy evaluation).
 * - open + booking_end 경과 → closed
 * - open + event_date 경과 → closed
 * 페이지 로드 시 호출하여 DB 상태를 최신으로 유지.
 * 변경이 있으면 true 반환.
 */
export async function autoTransitionStatus(
  supabase: SupabaseClient<Database>,
  event: Event
): Promise<boolean> {
  if (event.status !== "open") return false;

  const now = new Date();
  let shouldClose = false;

  // 예매 종료 시간이 지났으면 마감
  if (event.booking_end && new Date(event.booking_end) < now) {
    shouldClose = true;
  }

  // 행사 일자가 지났으면 마감
  if (event.event_date && new Date(event.event_date) < now) {
    shouldClose = true;
  }

  if (!shouldClose) return false;

  const { error } = await supabase
    .from("events")
    .update({ status: "closed" })
    .eq("id", event.id);

  if (error) {
    console.error("[autoTransitionStatus]", error);
    return false;
  }

  return true;
}
