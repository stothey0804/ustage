import type { Database } from "@/types/database";
import type { EventFormValues } from "@/lib/validations/event";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

/**
 * 기존 스테이지를 새 스테이지 작성 폼의 초기값으로 옮긴다("복사해서 만들기").
 *
 * 복사하지 않는 것:
 * - **일시(행사·예매 기간)** — 지난 날짜가 그대로 들어가면 저장 즉시 ended가 되거나
 *   예매 기간 검증에 걸린다. 새 회차는 날짜부터 다시 정하는 것이 자연스럽다.
 * - **포스터** — 같은 Storage 파일을 두 스테이지가 가리키게 되면, 한쪽에서 포스터를
 *   교체·삭제할 때(updateEvent/deleteEvent가 예전 파일을 지운다) 다른 쪽 포스터가 사라진다.
 * - slug·상태·번호 카운터 — 폼 값이 아니며 생성 시 새로 발급된다.
 */
export function copyEventFormValues(
  event: Pick<
    EventRow,
    | "title"
    | "description"
    | "booking_notice"
    | "cancel_policy"
    | "venue"
    | "venue_address"
    | "venue_lat"
    | "venue_lng"
    | "price"
    | "onsite_price"
    | "bank_info"
    | "contact"
    | "capacity"
    | "custom_fields"
  >
): Partial<EventFormValues> {
  return {
    title: event.title,
    description: event.description ?? "",
    booking_notice: event.booking_notice ?? "",
    cancel_policy: event.cancel_policy ?? "",
    venue: event.venue,
    venue_address: event.venue_address ?? undefined,
    venue_lat: event.venue_lat ?? undefined,
    venue_lng: event.venue_lng ?? undefined,
    price: event.price,
    onsite_price: event.onsite_price ?? undefined,
    bank_info: event.bank_info,
    contact: event.contact,
    capacity: event.capacity ?? undefined,
    custom_fields:
      (event.custom_fields as EventFormValues["custom_fields"]) ?? [],
  };
}
