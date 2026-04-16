"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: boolean };

export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "cancelled"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_id, events!inner(performer_id)")
    .eq("id", bookingId)
    .single();

  if (
    !booking ||
    (booking.events as { performer_id: string }).performer_id !== user.id
  ) {
    return { error: "권한이 없습니다." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    console.error("[updateBookingStatus]", error);
    return { error: "상태 변경에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${booking.event_id}`);
  return { success: true };
}

export async function deleteBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_id, events!inner(performer_id)")
    .eq("id", bookingId)
    .single();

  if (
    !booking ||
    (booking.events as { performer_id: string }).performer_id !== user.id
  ) {
    return { error: "권한이 없습니다." };
  }

  const eventId = booking.event_id;

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    console.error("[deleteBooking]", error);
    return { error: "예매 삭제에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true };
}
