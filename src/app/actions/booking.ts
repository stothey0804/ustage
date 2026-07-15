"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmed, getBaseUrl } from "@/lib/email";
import { formatKST } from "@/lib/date";

type ActionResult = { error?: string; success?: boolean };

type OwnerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  eventId: string;
};

/** 로그인 + 해당 예매가 속한 스테이지의 소유자인지 확인. 실패 시 error 반환. */
async function assertBookingOwner(
  bookingId: string
): Promise<OwnerContext | { error: string }> {
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

  return { supabase, eventId: booking.event_id };
}

type ConfirmEmailTarget = {
  email: string;
  name: string;
  quantity: number;
  userId: string | null;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  slug: string;
  tickets: { ticket_number: number; qr_token: string }[];
};

export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "cancelled"
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  // 확정(입금확인) 전환이면 갱신 전에 이전 상태·메일 정보를 조회
  // (이미 confirmed였던 예약에는 중복 발송하지 않기 위해)
  let confirmTarget: ConfirmEmailTarget | null = null;
  if (status === "confirmed") {
    const { data: full } = await ctx.supabase
      .from("bookings")
      .select(
        "name, email, quantity, status, user_id, booking_tickets(ticket_number, qr_token), events!inner(title, event_date, venue, venue_address, slug)"
      )
      .eq("id", bookingId)
      .single();

    if (full && full.status !== "confirmed" && full.email) {
      const ev = full.events as {
        title: string;
        event_date: string;
        venue: string;
        venue_address: string | null;
        slug: string;
      };
      confirmTarget = {
        email: full.email,
        name: full.name,
        quantity: full.quantity ?? 1,
        userId: full.user_id,
        eventTitle: ev.title,
        eventDate: formatKST(ev.event_date),
        eventVenue: ev.venue_address || ev.venue,
        slug: ev.slug,
        tickets: (full.booking_tickets ?? [])
          .slice()
          .sort((a, b) => a.ticket_number - b.ticket_number)
          .map((t) => ({ ticket_number: t.ticket_number, qr_token: t.qr_token })),
      };
    }
  }

  const { error } = await ctx.supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    console.error("[updateBookingStatus]", error);
    return { error: "상태 변경에 실패했습니다." };
  }

  // 입금확인 완료 메일 (입장 QR 포함) — 응답 후 발송
  if (confirmTarget && confirmTarget.tickets.length > 0) {
    const target = confirmTarget;
    const baseUrl = getBaseUrl();
    const confirmUrl = target.userId
      ? `${baseUrl}/dashboard/bookings/${bookingId}`
      : `${baseUrl}/e/${target.slug}/me`;

    after(() =>
      sendBookingConfirmed({
        to: target.email,
        name: target.name,
        quantity: target.quantity,
        eventTitle: target.eventTitle,
        eventDate: target.eventDate,
        eventVenue: target.eventVenue,
        confirmUrl,
        tickets: target.tickets,
      }).catch((err) => console.error("[email]", err))
    );
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true };
}

export async function forceCheckIn(
  bookingId: string,
  ticketId?: string
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  let query = ctx.supabase
    .from("booking_tickets")
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .eq("checked_in", false);

  if (ticketId) {
    query = query.eq("id", ticketId);
  }

  const { error } = await query;

  if (error) {
    console.error("[forceCheckIn]", error);
    return { error: "입장 처리에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true };
}

export async function resetBookingPassword(
  bookingId: string,
  newPassword: string
): Promise<ActionResult> {
  if (newPassword.length < 4) {
    return { error: "비밀번호는 4자 이상이어야 합니다." };
  }

  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await ctx.supabase
    .from("bookings")
    .update({ password_hash: hash })
    .eq("id", bookingId);

  if (error) {
    console.error("[resetBookingPassword]", error);
    return { error: "비밀번호 초기화에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true };
}

export async function deleteBooking(bookingId: string): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    console.error("[deleteBooking]", error);
    return { error: "예매 삭제에 실패했습니다." };
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true };
}
