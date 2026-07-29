"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendBookingCancelled,
  sendBookingConfirmation,
  sendBookingConfirmed,
  getBaseUrl,
} from "@/lib/email";
import { onsiteBookingSchema } from "@/lib/validations/booking";
import { sanitizeEventHtml } from "@/lib/sanitize";
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

/** 로그인 + 스테이지 소유자인지 확인. 실패 시 error 반환. */
export async function assertEventOwner(eventId: string): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      event: {
        id: string;
        title: string;
        slug: string;
        price: number;
        bank_info: string;
        event_date: string;
        venue: string;
        venue_address: string | null;
      };
    }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, slug, price, bank_info, event_date, venue, venue_address"
    )
    .eq("id", eventId)
    .eq("performer_id", user.id)
    .single();

  if (!event) return { error: "스테이지를 찾을 수 없거나 권한이 없습니다." };

  return { supabase, event };
}

type ConfirmEmailTarget = {
  email: string;
  name: string;
  quantity: number;
  bookingNo: number | null;
  userId: string | null;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  slug: string;
  tickets: { ticket_number: number; qr_token: string }[];
};

type CancelEmailTarget = {
  email: string;
  name: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  contact: string;
  cancelPolicyHtml?: string;
};

export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "cancelled"
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  // 주최자 취소 — 참석자에게 취소 통보 메일을 보낸다.
  // (이미 cancelled였던 예약에는 중복 발송하지 않기 위해 갱신 전에 조회)
  let cancelTarget: CancelEmailTarget | null = null;
  if (status === "cancelled") {
    const { data: full } = await ctx.supabase
      .from("bookings")
      .select(
        "name, email, quantity, status, events!inner(title, event_date, venue, venue_address, contact, cancel_policy)"
      )
      .eq("id", bookingId)
      .single();

    if (full && full.status !== "cancelled" && full.email) {
      const ev = full.events as {
        title: string;
        event_date: string;
        venue: string;
        venue_address: string | null;
        contact: string;
        cancel_policy: string | null;
      };
      cancelTarget = {
        email: full.email,
        name: full.name,
        quantity: full.quantity ?? 1,
        eventTitle: ev.title,
        eventDate: formatKST(ev.event_date),
        eventVenue: ev.venue_address || ev.venue,
        contact: ev.contact,
        cancelPolicyHtml: ev.cancel_policy
          ? sanitizeEventHtml(ev.cancel_policy)
          : undefined,
      };
    }
  }

  // 확정(입금확인) 전환이면 갱신 전에 이전 상태·메일 정보를 조회
  // (이미 confirmed였던 예약에는 중복 발송하지 않기 위해)
  let confirmTarget: ConfirmEmailTarget | null = null;
  if (status === "confirmed") {
    const { data: full } = await ctx.supabase
      .from("bookings")
      .select(
        "booking_no, name, email, quantity, status, user_id, booking_tickets(ticket_number, qr_token), events!inner(title, event_date, venue, venue_address, slug)"
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
        bookingNo: full.booking_no ?? null,
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
        bookingNo: target.bookingNo,
      }).catch((err) => console.error("[email]", err))
    );
  }

  // 주최자 취소 통보 메일 — 응답 후 발송
  if (cancelTarget) {
    const target = cancelTarget;
    after(() =>
      sendBookingCancelled({
        to: target.email,
        name: target.name,
        quantity: target.quantity,
        eventTitle: target.eventTitle,
        eventDate: target.eventDate,
        eventVenue: target.eventVenue,
        contact: target.contact,
        cancelPolicyHtml: target.cancelPolicyHtml,
        byOwner: true,
      }).catch((err) => console.error("[email]", err))
    );
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true };
}

/**
 * 명단에서 선택한 여러 건을 한 번에 입금확인/취소 처리.
 * 내 스테이지의 예매만 반영하고, 상태가 실제로 바뀐 건에만 메일을 보낸다.
 */
export async function updateBookingStatusBulk(
  bookingIds: string[],
  status: "pending" | "confirmed" | "cancelled"
): Promise<ActionResult & { updated?: number }> {
  if (bookingIds.length === 0) return { error: "선택된 예매가 없습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: rows, error: readError } = await supabase
    .from("bookings")
    .select(
      "id, booking_no, name, email, quantity, status, user_id, event_id, booking_tickets(ticket_number, qr_token), events!inner(performer_id, title, event_date, venue, venue_address, slug, contact, cancel_policy)"
    )
    .in("id", bookingIds);

  if (readError) {
    console.error("[updateBookingStatusBulk] read", readError);
    return { error: "예매 정보를 불러오지 못했습니다." };
  }

  type Row = NonNullable<typeof rows>[number];
  const owned = (rows ?? []).filter(
    (r) => (r.events as { performer_id: string }).performer_id === user.id
  );

  if (owned.length === 0) return { error: "권한이 없습니다." };

  // 상태가 실제로 바뀌는 건만 갱신 대상 — 메일 중복 발송 방지
  const changing = owned.filter((r) => r.status !== status);
  if (changing.length === 0) return { success: true, updated: 0 };

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status })
    .in(
      "id",
      changing.map((r) => r.id)
    );

  if (updateError) {
    console.error("[updateBookingStatusBulk] update", updateError);
    return { error: "상태 변경에 실패했습니다." };
  }

  const baseUrl = getBaseUrl();
  const eventInfo = (row: Row) =>
    row.events as {
      title: string;
      event_date: string;
      venue: string;
      venue_address: string | null;
      slug: string;
      contact: string;
      cancel_policy: string | null;
    };

  after(async () => {
    for (const row of changing) {
      if (!row.email) continue;
      const ev = eventInfo(row);
      const quantity = row.quantity ?? 1;

      if (status === "confirmed") {
        const tickets = (row.booking_tickets ?? [])
          .slice()
          .sort((a, b) => a.ticket_number - b.ticket_number)
          .map((t) => ({
            ticket_number: t.ticket_number,
            qr_token: t.qr_token,
          }));
        if (tickets.length === 0) continue;
        await sendBookingConfirmed({
          to: row.email,
          name: row.name,
          quantity,
          eventTitle: ev.title,
          eventDate: formatKST(ev.event_date),
          eventVenue: ev.venue_address || ev.venue,
          confirmUrl: row.user_id
            ? `${baseUrl}/dashboard/bookings/${row.id}`
            : `${baseUrl}/e/${ev.slug}/me`,
          tickets,
          bookingNo: row.booking_no ?? null,
        }).catch((err) => console.error("[email]", err));
      }

      if (status === "cancelled") {
        await sendBookingCancelled({
          to: row.email,
          name: row.name,
          quantity,
          eventTitle: ev.title,
          eventDate: formatKST(ev.event_date),
          eventVenue: ev.venue_address || ev.venue,
          contact: ev.contact,
          cancelPolicyHtml: ev.cancel_policy
            ? sanitizeEventHtml(ev.cancel_policy)
            : undefined,
          byOwner: true,
        }).catch((err) => console.error("[email]", err));
      }
    }
  });

  revalidatePath(`/dashboard/events/${changing[0].event_id}`);
  return { success: true, updated: changing.length };
}

/** 확정 메일(입장 QR 포함) 재발송 — 이미 확정된 예매에만 가능 */
export async function resendBookingConfirmation(
  bookingId: string
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId);
  if ("error" in ctx) return { error: ctx.error };

  const { data: booking } = await ctx.supabase
    .from("bookings")
    .select(
      "id, booking_no, name, email, quantity, status, user_id, booking_tickets(ticket_number, qr_token), events!inner(title, event_date, venue, venue_address, slug)"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "예매를 찾을 수 없습니다." };
  if (booking.status !== "confirmed") {
    return { error: "입금이 확인된 예매만 확정 메일을 보낼 수 있습니다." };
  }
  if (!booking.email) return { error: "이메일이 없어 발송할 수 없습니다." };

  const tickets = (booking.booking_tickets ?? [])
    .slice()
    .sort((a, b) => a.ticket_number - b.ticket_number)
    .map((t) => ({ ticket_number: t.ticket_number, qr_token: t.qr_token }));

  if (tickets.length === 0) return { error: "발급된 티켓이 없습니다." };

  const ev = booking.events as {
    title: string;
    event_date: string;
    venue: string;
    venue_address: string | null;
    slug: string;
  };
  const baseUrl = getBaseUrl();
  const email = booking.email;

  after(() =>
    sendBookingConfirmed({
      to: email,
      name: booking.name,
      quantity: booking.quantity ?? 1,
      eventTitle: ev.title,
      eventDate: formatKST(ev.event_date),
      eventVenue: ev.venue_address || ev.venue,
      confirmUrl: booking.user_id
        ? `${baseUrl}/dashboard/bookings/${booking.id}`
        : `${baseUrl}/e/${ev.slug}/me`,
      tickets,
      bookingNo: booking.booking_no ?? null,
    }).catch((err) => console.error("[email]", err))
  );

  return { success: true };
}

/**
 * 현장 예매 — 주최자가 명단에서 비회원 예매를 대신 만든다.
 *
 * 공개 예매 API와 다른 점:
 *  - **스테이지 상태를 검사하지 않는다.** 현장 예매는 보통 마감·종료 상태에서 쓴다.
 *    (게이트는 "이 스테이지의 소유자인가"뿐)
 *  - 좌석 정원은 그대로 검사한다 — 좌석은 물리적 제약이라 주최자도 초과할 수 없다.
 *  - 비회원 조회 비밀번호를 지정하지 않으면 4자리 숫자를 만들어 **평문을 한 번 돌려준다.**
 *    주최자가 그 자리에서 참석자에게 알려주는 용도다(이후에는 초기화로만 재발급).
 *  - `confirmNow`면 즉시 확정 + 입장 QR 확정 메일, 아니면 입금 안내 메일.
 */
export async function createOnsiteBooking(input: {
  eventId: string;
  name: string;
  email: string;
  quantity: number;
  password?: string;
  confirmNow: boolean;
  /** 중복 이메일 재확인 후 재시도 */
  allowDuplicate?: boolean;
}): Promise<
  | { error: string; code?: "duplicate_email" }
  | {
      success: true;
      bookingId: string;
      bookingNo: number | null;
      /** 자동 생성한 경우에만 — 주최자가 참석자에게 알려줘야 한다 */
      generatedPassword: string | null;
    }
> {
  const parsed = onsiteBookingSchema.safeParse({
    name: input.name,
    email: input.email,
    quantity: input.quantity,
    password: input.password || undefined,
    confirmNow: input.confirmNow,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const ctx = await assertEventOwner(input.eventId);
  if ("error" in ctx) return { error: ctx.error };

  const { event } = ctx;
  const values = parsed.data;
  const email = values.email.toLowerCase();
  const isFree = event.price === 0;
  // 무료 스테이지는 입금 개념이 없으므로 항상 확정
  const status: "pending" | "confirmed" =
    isFree || values.confirmNow ? "confirmed" : "pending";

  const generatedPassword = values.password
    ? null
    : String(randomInt(0, 10000)).padStart(4, "0");
  const passwordHash = await bcrypt.hash(
    values.password ?? generatedPassword!,
    10
  );

  const admin = createAdminClient();
  // database.ts에 RPC 타입이 없어 이 지점에서만 우회 캐스팅 (기존 예매 API와 동일 패턴)
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;

  const { data, error } = await rpc("create_onsite_booking", {
    p_event_id: event.id,
    p_name: values.name,
    p_email: email,
    p_password_hash: passwordHash,
    p_quantity: values.quantity,
    p_status: status,
    p_allow_duplicate: input.allowDuplicate ?? false,
  });

  if (error) {
    const message = error.message ?? "";

    if (message.includes("DUPLICATE_EMAIL")) {
      return {
        error: "이미 이 이메일로 예매된 내역이 있습니다.",
        code: "duplicate_email",
      };
    }
    const capacityMatch = message.match(/CAPACITY_EXCEEDED:(\d+)/);
    if (capacityMatch) {
      const remaining = Number(capacityMatch[1]);
      return {
        error:
          remaining <= 0
            ? "좌석이 모두 찼습니다. 좌석 한도를 늘린 뒤 다시 시도해 주세요."
            : `잔여 좌석이 ${remaining}석입니다. 매수를 조정해 주세요.`,
      };
    }
    if (message.includes("INVALID_QUANTITY")) {
      return { error: "최대 20매까지 예매할 수 있습니다." };
    }
    if (error.code === "PGRST202" || message.includes("create_onsite_booking")) {
      console.warn(
        "[createOnsiteBooking] create_onsite_booking RPC가 없습니다. " +
          "supabase/migrations/20260729110000_onsite_booking.sql을 적용하세요."
      );
      return {
        error:
          "현장 예매 기능이 아직 준비되지 않았습니다(마이그레이션 미적용). 관리자에게 문의해 주세요.",
      };
    }

    console.error("[createOnsiteBooking]", error);
    return { error: "현장 예매 생성에 실패했습니다." };
  }

  const bookingId = data as string;

  const { data: created } = await admin
    .from("bookings")
    .select("booking_no, booking_tickets(ticket_number, qr_token)")
    .eq("id", bookingId)
    .single();

  const bookingNo = created?.booking_no ?? null;
  const tickets = (created?.booking_tickets ?? [])
    .slice()
    .sort((a, b) => a.ticket_number - b.ticket_number)
    .map((t) => ({ ticket_number: t.ticket_number, qr_token: t.qr_token }));

  // 비회원이므로 확인 링크는 비회원 조회 페이지
  const confirmUrl = `${getBaseUrl()}/e/${event.slug}/me`;
  const eventVenue = event.venue_address || event.venue;
  const eventDate = formatKST(event.event_date);

  after(() => {
    if (status === "confirmed") {
      return sendBookingConfirmed({
        to: email,
        name: values.name,
        quantity: values.quantity,
        eventTitle: event.title,
        eventDate,
        eventVenue,
        confirmUrl,
        tickets,
        bookingNo,
      }).catch((err) => console.error("[email]", err));
    }
    return sendBookingConfirmation({
      to: email,
      name: values.name,
      quantity: values.quantity,
      eventTitle: event.title,
      eventDate,
      eventVenue,
      isFree,
      bankInfo: event.bank_info,
      totalAmount: event.price * values.quantity,
      confirmUrl,
      bookingNo,
    }).catch((err) => console.error("[email]", err));
  });

  revalidatePath(`/dashboard/events/${event.id}`);
  return { success: true, bookingId, bookingNo, generatedPassword };
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
