import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { createClient } from "@/lib/supabase/server";
import { bookingApiSchema } from "@/lib/validations/booking";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bookingApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 현재 로그인 사용자 확인 (없으면 null)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비회원은 비밀번호 필수
  if (!user && !data.password) {
    return NextResponse.json(
      { error: "비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  // 이벤트 조회
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, status, capacity, booking_start, booking_end, bank_info")
    .eq("id", data.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: "이벤트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 예매 가능 조건 1: 상태 확인
  if (event.status !== "open") {
    return NextResponse.json(
      { error: "현재 예매를 받지 않는 이벤트입니다." },
      { status: 409 }
    );
  }

  // 예매 가능 조건 2: 예매 기간 확인
  const now = new Date();
  if (event.booking_start && new Date(event.booking_start) > now) {
    return NextResponse.json(
      { error: "아직 예매 기간이 시작되지 않았습니다." },
      { status: 409 }
    );
  }
  if (event.booking_end && new Date(event.booking_end) < now) {
    return NextResponse.json(
      { error: "예매 기간이 종료되었습니다." },
      { status: 409 }
    );
  }

  // 예매 가능 조건 3: 좌석 여유 확인
  if (event.capacity) {
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .neq("status", "cancelled");

    if (count !== null && count >= event.capacity) {
      return NextResponse.json(
        { error: "좌석이 모두 찼습니다." },
        { status: 409 }
      );
    }
  }

  // 비밀번호 해시 (비회원만)
  // 로그인 사용자는 user_id로 예약 조회하므로 password_hash는 사용 안 함
  const password_hash = user
    ? ""
    : await bcrypt.hash(data.password!, 10);

  // 예매 생성
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      event_id: event.id,
      user_id: user?.id ?? null,
      name: data.name,
      password_hash,
      depositor_name: data.depositor_name,
      deposited_at: data.deposited_at,
      custom_answers: data.custom_answers ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    console.error("[bookings POST]", insertError);
    return NextResponse.json(
      { error: "예매 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ bookingId: booking.id }, { status: 201 });
}
