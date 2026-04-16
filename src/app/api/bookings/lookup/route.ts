import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { createAdminClient } from "@/lib/supabase/admin";

const lookupSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const { event_id, name, password } = parsed.data;

  const adminSupabase = createAdminClient();

  const { data: bookings, error } = await adminSupabase
    .from("bookings")
    .select("*, events!inner(id, title, event_date, venue, bank_info, slug)")
    .eq("event_id", event_id)
    .eq("name", name)
    .is("user_id", null);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  for (const booking of bookings ?? []) {
    const hash = booking.password_hash;
    if (hash && (await bcrypt.compare(password, hash))) {
      // 티켓 조회
      const { data: tickets } = await adminSupabase
        .from("booking_tickets")
        .select("qr_token, ticket_number, checked_in")
        .eq("booking_id", booking.id)
        .order("ticket_number", { ascending: true });

      const { password_hash, ...safeBooking } = booking;
      void password_hash;
      return NextResponse.json({
        booking: { ...safeBooking, tickets: tickets ?? [] },
      });
    }
  }

  return NextResponse.json(
    { error: "예약 정보를 찾을 수 없습니다." },
    { status: 404 }
  );
}
