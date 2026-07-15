import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventStatusFields = Pick<
  EventRow,
  "status" | "event_date" | "event_end_date" | "booking_start" | "booking_end"
>;

/** 행사 종료 시각 — 종료 일시가 있으면 그것을, 없으면 시작 일시를 사용. */
function eventEndInstant(event: EventStatusFields): Date | null {
  const end = event.event_end_date ?? event.event_date;
  return end ? new Date(end) : null;
}

/**
 * 저장된 상태 + 현재 시각만으로 전환돼야 할 상태를 계산 (부수효과 없음).
 * 여는 방향과 닫는 방향을 모두 다룬다:
 * - (draft/open/closed) + 행사 종료 시각 경과 → ended
 * - draft + 예매 시작 도래 + 예매창 유효 → open  (예매 시작일이 지나면 자동 오픈)
 * - open + booking_end 경과 → closed
 * closed는 수동 재오픈만 허용하므로 자동으로 open 되지 않는다.
 * 전환이 필요 없으면 null.
 */
export function deriveAutoStatus(
  event: EventStatusFields
): "open" | "closed" | "ended" | null {
  const status = event.status ?? "draft";
  if (status === "ended") return null;

  const now = new Date();

  // 종료가 최우선 — draft로 방치돼 행사일이 지난 것도 ended 처리
  const end = eventEndInstant(event);
  if (end && end < now) return "ended";

  if (status === "draft") {
    const bookingStarted =
      event.booking_start != null && new Date(event.booking_start) <= now;
    const bookingWindowOpen =
      event.booking_end == null || new Date(event.booking_end) >= now;
    if (bookingStarted && bookingWindowOpen) return "open";
    return null;
  }

  if (status === "open") {
    if (event.booking_end && new Date(event.booking_end) < now) return "closed";
    return null;
  }

  return null;
}

/**
 * 생성/수정 시 저장할 초기 상태를 계산.
 * draft를 기준으로 파생 상태를 구해, 예매 시작이 이미 지난 경우 즉시 open으로,
 * 행사가 이미 끝난 경우 ended로 저장한다. 그 외엔 draft.
 */
export function computeInitialStatus(
  fields: Omit<EventStatusFields, "status">
): "draft" | "open" | "ended" {
  const derived = deriveAutoStatus({ ...fields, status: "draft" });
  if (derived === "open" || derived === "ended") return derived;
  return "draft";
}

/**
 * 스테이지 상태를 조건에 따라 자동 전환 (lazy evaluation).
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
    .eq("status", (event.status ?? "draft") as string); // 경합 시 다른 전환(수동 마감 등)을 덮어쓰지 않도록

  if (error) {
    console.error("[autoTransitionStatus]", error);
    return null;
  }

  return newStatus;
}
