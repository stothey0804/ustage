"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const { data, error } = await supabase
    .from("events")
    .insert({
      performer_id: user.id,
      slug: generateSlug(),
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
      status: "draft",
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

export async function updateEventStatus(
  id: string,
  status: "draft" | "open" | "closed"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

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
