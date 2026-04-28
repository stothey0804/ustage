import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Event = Database["public"]["Tables"]["events"]["Row"];

/**
 * 이벤트 상태를 조건에 따라 자동 전환 (lazy evaluation).
 * - open + booking_end 경과 → closed (예매 마감)
 * - open + event_date 경과 → ended (행사 종료)
 * - closed + event_date 경과 → ended (행사 종료)
 * 변경된 상태를 반환. 변경 없으면 null.
 */
export async function autoTransitionStatus(
  supabase: SupabaseClient<Database>,
  event: Event
): Promise<string | null> {
  if (event.status !== "open" && event.status !== "closed") return null;

  const now = new Date();
  let newStatus: string | null = null;

  // 행사일 경과 → ended (open이든 closed든)
  if (event.event_date && new Date(event.event_date) < now) {
    newStatus = "ended";
  }
  // 예매 종료 경과 + 아직 open → closed
  else if (
    event.status === "open" &&
    event.booking_end &&
    new Date(event.booking_end) < now
  ) {
    newStatus = "closed";
  }

  if (!newStatus) return null;

  const { error } = await supabase
    .from("events")
    .update({ status: newStatus })
    .eq("id", event.id);

  if (error) {
    console.error("[autoTransitionStatus]", error);
    return null;
  }

  return newStatus;
}
