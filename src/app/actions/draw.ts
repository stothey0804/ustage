"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";

import { assertEventOwner } from "@/app/actions/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskEmail, maskName } from "@/lib/mask";
import {
  drawWinners,
  selectDrawCandidates,
  type DrawCandidateRow,
} from "@/lib/lottery";

export type DrawWinner = {
  /** 인원 번호 (booking_tickets.attendee_no) */
  attendeeNo: number;
  maskedName: string;
  maskedEmail: string;
};

export type DrawResult = {
  round: number;
  winners: DrawWinner[];
  /** 이번 추첨에 참여한 후보 수 */
  candidateCount: number;
};

/** 한 번에 뽑을 수 있는 상한 — 오입력(0 여러 개)으로 전원이 뽑히는 것을 막는 안전장치 */
const MAX_WINNERS_PER_DRAW = 50;

/**
 * 현장 추첨. 입장 완료된 예매만 후보로 삼고, 결과를 event_draws에 회차별로 남긴다.
 *
 * 추첨은 서버에서 node:crypto로 수행한다 — 클라이언트 Math.random은 조작 가능하고
 * 현장에서 신뢰를 요구하는 절차라 서버가 뽑는 편이 맞다.
 */
export async function runDraw(
  eventId: string,
  opts: { count: number; excludePrevious: boolean }
): Promise<{ error: string } | DrawResult> {
  const count = Math.floor(opts.count);
  if (!Number.isFinite(count) || count < 1) {
    return { error: "뽑을 인원을 1명 이상으로 입력해 주세요." };
  }
  if (count > MAX_WINNERS_PER_DRAW) {
    return { error: `한 번에 최대 ${MAX_WINNERS_PER_DRAW}명까지 뽑을 수 있습니다.` };
  }

  const ctx = await assertEventOwner(eventId, "run_draw");
  if ("error" in ctx) return { error: ctx.error };

  const { supabase } = ctx;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, booking_no, name, email, status, booking_tickets(id, ticket_number, attendee_no, checked_in, cancelled_at)"
    )
    .eq("event_id", eventId);

  if (bookingsError) {
    console.error("[runDraw] bookings", bookingsError);
    return { error: "예매 정보를 불러오지 못했습니다." };
  }

  const { data: draws, error: drawsError } = await supabase
    .from("event_draws")
    .select("ticket_id, round")
    .eq("event_id", eventId);

  if (drawsError) {
    console.error("[runDraw] draws", drawsError);
    return { error: "추첨 기록을 불러오지 못했습니다." };
  }

  const previousRounds = draws ?? [];

  /**
   * 회차는 DB 카운터로 발급한다 — `max(round) + 1`을 코드에서 계산하면 소유자와
   * 스태프가 동시에 추첨했을 때 같은 번호가 두 번 나와 두 추첨이 한 회차로 합쳐진다.
   * (마이그레이션 미적용 환경에서는 예전 방식으로 폴백한다.)
   */
  const admin = createAdminClient();
  const rpc = admin.rpc.bind(admin) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;

  const { data: allocated, error: roundError } = await rpc("next_draw_round", {
    p_event_id: eventId,
  });

  let nextRound: number;
  if (roundError?.code === "PGRST202") {
    console.warn(
      "[runDraw] next_draw_round RPC가 없어 max+1로 발급합니다. " +
        "supabase/migrations/20260831130000_draw_round_counter.sql을 적용하세요."
    );
    nextRound = previousRounds.reduce((max, d) => Math.max(max, d.round), 0) + 1;
  } else if (roundError || typeof allocated !== "number") {
    console.error("[runDraw] next_draw_round", roundError);
    return { error: "회차를 발급하지 못했습니다. 다시 시도해 주세요." };
  } else {
    nextRound = allocated;
  }

  // 제외는 **티켓 단위** — 같은 예매의 아직 안 뽑힌 동반자는 후보로 남는다
  const excluded = opts.excludePrevious
    ? new Set(
        previousRounds
          .map((d) => d.ticket_id)
          .filter((id): id is string => id !== null)
      )
    : new Set<string>();

  const candidates = selectDrawCandidates(
    (bookings ?? []) as DrawCandidateRow[],
    excluded
  );

  if (candidates.length === 0) {
    return {
      error: opts.excludePrevious
        ? "남은 추첨 대상이 없습니다. 이전 당첨자를 포함하거나 기록을 초기화해 주세요."
        : "추첨 대상이 없습니다. QR 스캔으로 입장 처리된 티켓(참석자)만 추첨에 들어갑니다.",
    };
  }

  const winners = drawWinners(candidates, count, (max) => randomInt(max));

  const { error: insertError } = await supabase.from("event_draws").insert(
    winners.map((w) => ({
      event_id: eventId,
      booking_id: w.bookingId,
      ticket_id: w.ticketId,
      attendee_no: w.attendeeNo,
      round: nextRound,
    }))
  );

  if (insertError) {
    console.error("[runDraw] insert", insertError);
    return { error: "추첨 결과 저장에 실패했습니다. 다시 시도해 주세요." };
  }

  revalidatePath(`/dashboard/events/${eventId}`);

  return {
    round: nextRound,
    candidateCount: candidates.length,
    winners: winners.map((w) => ({
      attendeeNo: w.attendeeNo,
      maskedName: maskName(w.name),
      maskedEmail: maskEmail(w.email),
    })),
  };
}

/** 추첨 기록 전체 삭제 — 회차와 '이전 당첨자 제외' 기준이 초기화된다. */
export async function resetDraws(
  eventId: string
): Promise<{ error?: string; success?: boolean }> {
  // 기록 초기화는 소유자 전용 (현장 분쟁 근거를 지우는 파괴적 동작)
  const ctx = await assertEventOwner(eventId, "reset_draws");
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("event_draws")
    .delete()
    .eq("event_id", eventId);

  if (error) {
    console.error("[resetDraws]", error);
    return { error: "추첨 기록 초기화에 실패했습니다." };
  }

  // 회차 카운터도 되돌린다 — 기록을 지웠는데 다음 추첨이 5회차로 시작하면 이상하다.
  // (실패해도 기록 초기화 자체는 끝났으므로 로그만 남긴다)
  const { error: seqError } = await createAdminClient()
    .from("events")
    .update({ draw_seq: 0 })
    .eq("id", eventId);
  if (seqError) console.error("[resetDraws] draw_seq", seqError);

  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: true };
}
