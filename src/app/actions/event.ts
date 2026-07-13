"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeInitialStatus } from "@/lib/auto-status";
import { eventSchema, type EventFormValues } from "@/lib/validations/event";

type ActionResult = { error?: string; success?: boolean; id?: string };

/**
 * datetime-local 값("YYYY-MM-DDTHH:mm")을 KST 기준 ISO 문자열로 변환.
 * 타임존 정보가 없는 값을 그대로 DB에 넣으면 UTC로 해석되어 +9시간 오차 발생.
 */
function toKST(v: string | undefined | null): string | null {
  if (!v) return null;
  // 이미 타임존 정보가 있으면 그대로 사용
  if (v.includes("+") || v.endsWith("Z")) return v;
  return v.length <= 16 ? `${v}:00+09:00` : `${v}+09:00`;
}

function generateSlug(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

export async function createEvent(
  values: EventFormValues
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const v = parsed.data;

  // 유료 이벤트는 계좌 필수
  if (v.price > 0 && !v.bank_info) {
    return { error: "계좌 정보를 입력해 주세요." };
  }

  const eventDate = toKST(v.event_date)!;
  const eventEndDate = toKST(v.event_end_date);
  const bookingStart = toKST(v.booking_start);
  const bookingEnd = toKST(v.booking_end);

  // 예매 시작이 이미 지났으면 즉시 open, 행사가 이미 지났으면 ended — 그 외엔 draft.
  const status = computeInitialStatus({
    event_date: eventDate,
    event_end_date: eventEndDate,
    booking_start: bookingStart,
    booking_end: bookingEnd,
  });

  const { data, error } = await supabase
    .from("events")
    .insert({
      performer_id: user.id,
      slug: generateSlug(),
      title: v.title,
      description: v.description ?? null,
      poster_url: v.poster_url ?? null,
      event_date: eventDate,
      event_end_date: eventEndDate,
      venue: v.venue,
      venue_address: v.venue_address ?? null,
      venue_lat: v.venue_lat ?? null,
      venue_lng: v.venue_lng ?? null,
      price: v.price,
      bank_info: v.bank_info,
      contact: v.contact,
      capacity: v.capacity ?? null,
      booking_start: bookingStart,
      booking_end: bookingEnd,
      custom_fields: v.custom_fields ?? null,
      status,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createEvent]", error);
    return { error: "이벤트 생성에 실패했습니다." };
  }

  revalidatePath("/dashboard/events");
  return { success: true, id: data.id };
}

export async function updateEvent(
  id: string,
  values: EventFormValues
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const v = parsed.data;

  if (v.price > 0 && !v.bank_info) {
    return { error: "계좌 정보를 입력해 주세요." };
  }

  const { data: current } = await supabase
    .from("events")
    .select("id, price")
    .eq("id", id)
    .eq("performer_id", user.id)
    .single();

  if (!current) return { error: "이벤트를 찾을 수 없거나 권한이 없습니다." };

  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("quantity, status")
    .eq("event_id", id)
    .neq("status", "cancelled");

  const activeCount = activeBookings?.length ?? 0;
  const seatCount = (activeBookings ?? []).reduce(
    (sum, b) => sum + (b.quantity ?? 1),
    0
  );

  // 유료↔무료 전환은 기존 예매의 입금 흐름(pending/confirmed 판정)을 깨뜨림
  if (activeCount > 0 && (current.price === 0) !== (v.price === 0)) {
    return {
      error:
        "예매가 있는 이벤트는 유료/무료를 변경할 수 없습니다. 기존 예매를 먼저 취소 처리해 주세요.",
    };
  }

  // 정원을 이미 예매된 좌석 수 아래로 줄이는 것을 차단
  if (v.capacity != null && v.capacity < seatCount) {
    return {
      error: `이미 ${seatCount}석이 예매되어 좌석 수를 ${v.capacity}석으로 줄일 수 없습니다.`,
    };
  }

  const { error } = await supabase
    .from("events")
    .update({
      title: v.title,
      description: v.description ?? null,
      poster_url: v.poster_url ?? null,
      event_date: toKST(v.event_date)!,
      event_end_date: toKST(v.event_end_date),
      venue: v.venue,
      venue_address: v.venue_address ?? null,
      venue_lat: v.venue_lat ?? null,
      venue_lng: v.venue_lng ?? null,
      price: v.price,
      bank_info: v.bank_info,
      contact: v.contact,
      capacity: v.capacity ?? null,
      booking_start: toKST(v.booking_start),
      booking_end: toKST(v.booking_end),
      custom_fields: v.custom_fields ?? null,
    })
    .eq("id", id)
    .eq("performer_id", user.id);

  if (error) {
    console.error("[updateEvent]", error);
    return { error: "이벤트 수정에 실패했습니다." };
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${id}`);
  return { success: true, id };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: event } = await supabase
    .from("events")
    .select("id, poster_url")
    .eq("id", id)
    .eq("performer_id", user.id)
    .single();

  if (!event) return { error: "이벤트를 찾을 수 없거나 권한이 없습니다." };

  // 취소된 예매를 포함해 예매 이력이 하나라도 있으면 삭제 불가 (기록 보존)
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);

  if ((count ?? 0) > 0) {
    return {
      error:
        "예매 내역이 있는 이벤트는 삭제할 수 없습니다. 대신 상태를 마감으로 변경해 주세요.",
    };
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("performer_id", user.id);

  if (error) {
    console.error("[deleteEvent]", error);
    return { error: "이벤트 삭제에 실패했습니다." };
  }

  // 포스터 파일 정리 (실패해도 무시 — 고아 파일만 남음)
  if (event.poster_url) {
    const marker = "/object/public/posters/";
    const idx = event.poster_url.indexOf(marker);
    if (idx !== -1) {
      try {
        const path = decodeURIComponent(
          event.poster_url.slice(idx + marker.length)
        );
        await supabase.storage.from("posters").remove([path]);
      } catch (err) {
        console.error("[deleteEvent] poster cleanup", err);
      }
    }
  }

  revalidatePath("/dashboard/events");
  return { success: true };
}

export async function updateEventStatus(
  id: string,
  status: "draft" | "open" | "closed" | "ended"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, status, booking_start, booking_end, event_date, event_end_date, capacity"
    )
    .eq("id", id)
    .eq("performer_id", user.id)
    .single();

  if (!event) return { error: "이벤트를 찾을 수 없거나 권한이 없습니다." };

  // 오픈(재오픈 포함) 조건 서버 검증 — 클라이언트 검증 우회 대비.
  // 예매 기간은 필수가 아니다: 미설정 시 즉시 수동 오픈(수동 관리)을 허용한다.
  if (status === "open") {
    const now = new Date();
    const eventEnd = event.event_end_date ?? event.event_date;
    if (eventEnd && new Date(eventEnd) < now) {
      return { error: "이미 종료된 행사는 오픈할 수 없습니다." };
    }
    if (event.booking_end && new Date(event.booking_end) < now) {
      return { error: "예매 종료 일시가 지났습니다. 예매 기간을 수정해 주세요." };
    }
    if (event.capacity) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("quantity, status")
        .eq("event_id", id)
        .neq("status", "cancelled");

      const seatCount = (bookings ?? []).reduce(
        (sum, b) => sum + (b.quantity ?? 1),
        0
      );
      if (seatCount >= event.capacity) {
        return { error: "좌석이 모두 차서 오픈할 수 없습니다." };
      }
    }
  }

  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", id)
    .eq("performer_id", user.id);

  if (error) {
    console.error("[updateEventStatus]", error);
    return { error: "상태 변경에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { success: true };
}
