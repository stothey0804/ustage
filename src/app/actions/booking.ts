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
import { formatBookingNoRange } from "@/lib/booking-code";
import {
  assertBookingAccess,
  assertEventAccess,
  myStaffEventIds,
} from "@/lib/event-access";
import type { EventCapability, EventRole } from "@/lib/staff-permissions";

type ActionResult = { error?: string; success?: boolean };

type OwnerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  eventId: string;
  /** 감사 추적용 — 누가 처리했는지 기록한다 */
  userId: string;
};

/**
 * 로그인 + 이 예매를 그 동작으로 다룰 수 있는지 확인 (소유자 또는 스태프).
 * 실제 판정은 lib/event-access의 단일 관문이 한다.
 */
async function assertBookingOwner(
  bookingId: string,
  capability: EventCapability
): Promise<OwnerContext | { error: string }> {
  const access = await assertBookingAccess(bookingId, capability);
  if ("error" in access) return { error: access.error };
  return {
    supabase: access.supabase,
    eventId: access.eventId,
    userId: access.userId,
  };
}

/**
 * 스테이지 단위 권한 확인. 기존 호출부 호환을 위해 남겨둔 얇은 래퍼로,
 * capability를 넘겨 소유자 전용/스태프 허용을 구분한다.
 */
export async function assertEventOwner(
  eventId: string,
  capability: EventCapability = "manage_staff"
): Promise<
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
      role: EventRole;
      userId: string;
    }
  | { error: string }
> {
  const access = await assertEventAccess(eventId, capability);
  if ("error" in access) return { error: access.error };
  return {
    supabase: access.supabase,
    event: access.event,
    role: access.role,
    userId: access.userId,
  };
}

type ConfirmEmailTarget = {
  email: string;
  name: string;
  quantity: number;
  bookingNoLabel: string;
  userId: string | null;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  slug: string;
  tickets: {
    ticket_number: number;
    qr_token: string;
    attendee_no: number | null;
  }[];
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
): Promise<ActionResult & { updated?: number; mailed?: number }> {
  const ctx = await assertBookingOwner(
    bookingId,
    status === "cancelled" ? "cancel_booking" : "confirm_payment"
  );
  if ("error" in ctx) return { error: ctx.error };

  // 주최자 취소 — 참석자에게 취소 통보 메일을 보낸다.
  // (이미 cancelled였던 예약에는 중복 발송하지 않기 위해 갱신 전에 조회)
  // 갱신 전 상태 — 실제로 바뀌었는지(=메일이 나갔는지) 판단에 쓴다.
  // 되돌리기(pending)는 조회하지 않으므로 null로 남는다.
  let previousStatus: string | null = null;
  let cancelTarget: CancelEmailTarget | null = null;
  if (status === "cancelled") {
    const { data: full } = await ctx.supabase
      .from("bookings")
      .select(
        "name, email, quantity, status, events!inner(title, event_date, venue, venue_address, contact, cancel_policy)"
      )
      .eq("id", bookingId)
      .single();

    previousStatus = full?.status ?? null;
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
        "booking_no, name, email, quantity, status, user_id, booking_tickets(ticket_number, qr_token, attendee_no), events!inner(title, event_date, venue, venue_address, slug)"
      )
      .eq("id", bookingId)
      .single();

    previousStatus = full?.status ?? null;
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
        bookingNoLabel: formatBookingNoRange(
          full.booking_no,
          full.quantity ?? 1,
          bookingId
        ),
        userId: full.user_id,
        eventTitle: ev.title,
        eventDate: formatKST(ev.event_date),
        eventVenue: ev.venue_address || ev.venue,
        slug: ev.slug,
        tickets: (full.booking_tickets ?? [])
          .slice()
          .sort((a, b) => a.ticket_number - b.ticket_number)
          .map((t) => ({
            ticket_number: t.ticket_number,
            qr_token: t.qr_token,
            attendee_no: t.attendee_no,
          })),
      };
    }
  }

  const { error } = await ctx.supabase
    .from("bookings")
    .update({ status, status_updated_by: ctx.userId })
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
        bookingNoLabel: target.bookingNoLabel,
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
  // 실제로 바뀐/메일이 예약된 건수 — 화면 안내 문구가 사실과 어긋나지 않게 한다
  const mailed =
    (confirmTarget && confirmTarget.tickets.length > 0) || cancelTarget ? 1 : 0;
  const updated = previousStatus === null || previousStatus !== status ? 1 : 0;
  return { success: true, updated, mailed };
}

/**
 * 명단에서 선택한 여러 건을 한 번에 입금확인/취소 처리.
 * 내 스테이지의 예매만 반영하고, 상태가 실제로 바뀐 건에만 메일을 보낸다.
 */
export async function updateBookingStatusBulk(
  bookingIds: string[],
  status: "pending" | "confirmed" | "cancelled"
): Promise<ActionResult & { updated?: number; mailed?: number }> {
  if (bookingIds.length === 0) return { error: "선택된 예매가 없습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const { data: rows, error: readError } = await supabase
    .from("bookings")
    .select(
      "id, booking_no, name, email, quantity, status, user_id, event_id, booking_tickets(ticket_number, qr_token, attendee_no), events!inner(performer_id, title, event_date, venue, venue_address, slug, contact, cancel_policy)"
    )
    .in("id", bookingIds);

  if (readError) {
    console.error("[updateBookingStatusBulk] read", readError);
    return { error: "예매 정보를 불러오지 못했습니다." };
  }

  type Row = NonNullable<typeof rows>[number];
  // 내가 소유한 스테이지 + 스태프로 참여한 스테이지의 예매만 처리한다
  const staffEventIds = new Set(await myStaffEventIds(supabase, user.id));
  const owned = (rows ?? []).filter(
    (r) =>
      (r.events as { performer_id: string }).performer_id === user.id ||
      staffEventIds.has(r.event_id)
  );

  if (owned.length === 0) return { error: "권한이 없습니다." };

  // 상태가 실제로 바뀌는 건만 갱신 대상 — 메일 중복 발송 방지
  const changing = owned.filter((r) => r.status !== status);
  if (changing.length === 0) return { success: true, updated: 0, mailed: 0 };

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status, status_updated_by: user.id })
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
            attendee_no: t.attendee_no,
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
          bookingNoLabel: formatBookingNoRange(row.booking_no, quantity, row.id),
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

  // after() 안에서는 셀 수 없으므로 발송 대상을 미리 센다
  const mailed = changing.filter((row) => {
    if (!row.email) return false;
    if (status === "confirmed") return (row.booking_tickets ?? []).length > 0;
    return status === "cancelled";
  }).length;

  revalidatePath(`/dashboard/events/${changing[0].event_id}`);
  return { success: true, updated: changing.length, mailed };
}

/** 확정 메일(입장 QR 포함) 재발송 — 이미 확정된 예매에만 가능 */
export async function resendBookingConfirmation(
  bookingId: string
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId, "resend_confirmation");
  if ("error" in ctx) return { error: ctx.error };

  const { data: booking } = await ctx.supabase
    .from("bookings")
    .select(
      "id, booking_no, name, email, quantity, cancelled_quantity, status, user_id, booking_tickets(ticket_number, qr_token, attendee_no, cancelled_at), events!inner(title, event_date, venue, venue_address, slug)"
    )
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "예매를 찾을 수 없습니다." };
  if (booking.status !== "confirmed") {
    return { error: "입금이 확인된 예매만 확정 메일을 보낼 수 있습니다." };
  }
  if (!booking.email) return { error: "이메일이 없어 발송할 수 없습니다." };

  // 부분 취소된 티켓의 QR은 무효이므로 메일에 싣지 않는다
  const tickets = (booking.booking_tickets ?? [])
    .filter((t) => !t.cancelled_at)
    .slice()
    .sort((a, b) => a.ticket_number - b.ticket_number)
    .map((t) => ({
      ticket_number: t.ticket_number,
      qr_token: t.qr_token,
      attendee_no: t.attendee_no,
    }));

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
      quantity: tickets.length,
      eventTitle: ev.title,
      eventDate: formatKST(ev.event_date),
      eventVenue: ev.venue_address || ev.venue,
      confirmUrl: booking.user_id
        ? `${baseUrl}/dashboard/bookings/${booking.id}`
        : `${baseUrl}/e/${ev.slug}/me`,
      tickets,
      bookingNoLabel: formatBookingNoRange(
        booking.booking_no,
        booking.quantity ?? 1,
        booking.id
      ),
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

  const ctx = await assertEventOwner(input.eventId, "onsite_booking");
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
    .select("booking_no, booking_tickets(ticket_number, qr_token, attendee_no)")
    .eq("id", bookingId)
    .single();

  const bookingNo = created?.booking_no ?? null;
  const tickets = (created?.booking_tickets ?? [])
    .slice()
    .sort((a, b) => a.ticket_number - b.ticket_number)
    .map((t) => ({
      ticket_number: t.ticket_number,
      qr_token: t.qr_token,
      attendee_no: t.attendee_no,
    }));

  const bookingNoLabel = formatBookingNoRange(
    bookingNo,
    values.quantity,
    bookingId
  );

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
        bookingNoLabel,
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
      bookingNoLabel,
    }).catch((err) => console.error("[email]", err));
  });

  revalidatePath(`/dashboard/events/${event.id}`);
  return { success: true, bookingId, bookingNo, generatedPassword };
}

export async function forceCheckIn(
  bookingId: string,
  ticketId?: string
): Promise<ActionResult> {
  const ctx = await assertBookingOwner(bookingId, "check_in");
  if ("error" in ctx) return { error: ctx.error };

  let query = ctx.supabase
    .from("booking_tickets")
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: ctx.userId,
    })
    .eq("booking_id", bookingId)
    .eq("checked_in", false)
    // 부분 취소된 티켓은 강제 입장도 막는다 (QR 스캔 경로와 같은 규칙)
    .is("cancelled_at", null);

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

/**
 * 부분(티켓 단위) 취소 — 주최자·스태프 전용.
 *
 * 2매 이상 예매에서 일부만 취소한다. 취소된 티켓의 QR은 즉시 무효가 되고 좌석은
 * 그만큼 반환된다(`lib/seats.ts`의 유효 매수 계산). 입장 처리된 티켓은 취소할 수
 * 없다 — "당첨 티켓 = 입장 티켓" 불변식이 깨지기 때문이며, 되돌릴 일은 예매 전체
 * 취소로 처리한다. 전량이 취소되면 RPC가 같은 트랜잭션에서 예매를 cancelled로
 * 승격시킨다(승격을 빼먹으면 중복 이메일 검사가 재예매를 영구 차단한다).
 *
 * 참석자 셀프 부분 취소는 아직 없다 — 문의를 받아 주최자가 처리한다.
 */
export async function cancelBookingTickets(
  bookingId: string,
  ticketIds: string[]
): Promise<ActionResult & { cancelled?: number; remaining?: number }> {
  if (ticketIds.length === 0) return { error: "취소할 티켓을 선택해 주세요." };

  const ctx = await assertBookingOwner(bookingId, "cancel_booking");
  if ("error" in ctx) return { error: ctx.error };

  // 메일에 쓸 정보는 갱신 전에 읽는다(취소된 인원 번호를 알아야 한다)
  const { data: before } = await ctx.supabase
    .from("bookings")
    .select(
      "id, name, email, quantity, cancelled_quantity, status, booking_tickets(id, attendee_no, ticket_number, checked_in, cancelled_at), events!inner(title, event_date, venue, venue_address, contact, cancel_policy, price)"
    )
    .eq("id", bookingId)
    .single();

  if (!before) return { error: "예매를 찾을 수 없습니다." };
  if (before.status === "cancelled") {
    return { error: "이미 취소된 예매입니다." };
  }

  const selected = (before.booking_tickets ?? []).filter((t) =>
    ticketIds.includes(t.id)
  );
  if (selected.length !== ticketIds.length) {
    return { error: "이 예매의 티켓이 아닙니다." };
  }
  if (selected.some((t) => t.checked_in)) {
    return {
      error:
        "입장 처리된 티켓은 부분 취소할 수 없습니다. 필요하면 예매 전체를 취소해 주세요.",
    };
  }
  if (selected.some((t) => t.cancelled_at)) {
    return { error: "이미 취소된 티켓이 포함되어 있습니다." };
  }

  const admin = createAdminClient();
  // database.ts 재생성 전까지 RPC 타입 부재 — 이 지점에서만 우회 캐스팅
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;

  const { data, error } = await rpc("cancel_booking_tickets", {
    p_booking_id: bookingId,
    p_ticket_ids: ticketIds,
    p_actor: ctx.userId,
  });

  if (error) {
    console.error("[cancelBookingTickets]", error);
    const message = error.message ?? "";
    if (message.includes("TICKET_NOT_CANCELLABLE")) {
      return {
        error:
          "선택한 티켓 중 입장 처리되었거나 이미 취소된 것이 있습니다. 화면을 새로고침해 주세요.",
      };
    }
    if (message.includes("ALREADY_CANCELLED")) {
      return { error: "이미 취소된 예매입니다." };
    }
    return { error: "티켓 취소에 실패했습니다." };
  }

  const result = (data ?? {}) as {
    cancelled?: number;
    remaining?: number;
    promoted?: boolean;
  };
  const cancelled = result.cancelled ?? selected.length;
  const remaining = result.remaining ?? 0;

  const ev = before.events as unknown as {
    title: string;
    event_date: string;
    venue: string;
    venue_address: string | null;
    contact: string;
    cancel_policy: string | null;
    price: number;
  };
  const email = before.email;
  const cancelledNos = selected
    .map((t) => t.attendee_no ?? t.ticket_number)
    .sort((a, b) => a - b);

  if (email) {
    after(() =>
      sendBookingCancelled({
        to: email,
        name: before.name,
        quantity: before.quantity ?? 1,
        eventTitle: ev.title,
        eventDate: formatKST(ev.event_date),
        eventVenue: ev.venue_address || ev.venue,
        contact: ev.contact,
        cancelPolicyHtml: ev.cancel_policy
          ? sanitizeEventHtml(ev.cancel_policy)
          : undefined,
        byOwner: true,
        // 전량 취소면 부분이 아니라 전체 취소 메일로 보낸다
        partial:
          remaining > 0
            ? {
                cancelledAttendeeNos: cancelledNos,
                remainingQuantity: remaining,
                refundAmount:
                  ev.price > 0 && before.status === "confirmed"
                    ? ev.price * cancelled
                    : undefined,
              }
            : undefined,
      }).catch((err) => console.error("[email]", err))
    );
  }

  revalidatePath(`/dashboard/events/${ctx.eventId}`);
  return { success: true, cancelled, remaining };
}

export async function resetBookingPassword(
  bookingId: string,
  newPassword: string
): Promise<ActionResult> {
  if (newPassword.length < 4) {
    return { error: "비밀번호는 4자 이상이어야 합니다." };
  }

  const ctx = await assertBookingOwner(bookingId, "reset_booking_password");
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
  const ctx = await assertBookingOwner(bookingId, "delete_booking");
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
