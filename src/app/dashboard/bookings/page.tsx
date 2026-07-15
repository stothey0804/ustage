import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket, Calendar, MapPin } from "lucide-react";
import { formatKST } from "@/lib/date";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/StatusBadge";

const LIST_DATE_FORMAT = "yyyy. M. d. (EEE) HH:mm";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*, events(id, title, event_date, venue, slug, price)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">내 예약</h1>

      {!bookings || bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Ticket className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">아직 예매한 스테이지가 없어요</p>
            <p className="text-sm text-muted-foreground">
              스테이지 링크를 받으면 여기에서 예매 현황과 입장 QR을 볼 수 있어요.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const event = booking.events as {
              id: string;
              title: string;
              event_date: string;
              venue: string;
              slug: string;
              price: number;
            } | null;

            const isFree = event?.price === 0;
            const status = booking.status;
            const quantity = booking.quantity ?? 1;

            return (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
              >
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-semibold leading-snug">
                        {event?.title ?? "알 수 없는 스테이지"}
                      </CardTitle>
                      <BookingStatusBadge
                        status={status}
                        isFree={isFree}
                        className="mt-0.5 shrink-0"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {event?.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatKST(event.event_date, LIST_DATE_FORMAT)}
                      </span>
                    )}
                    {event?.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {event.venue}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Ticket className="size-3.5" />
                      {quantity}매
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
