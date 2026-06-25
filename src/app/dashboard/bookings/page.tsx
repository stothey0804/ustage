import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { formatKST } from "@/lib/date";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/StatusBadge";

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
            <p className="font-medium">아직 예매한 공연이 없어요</p>
            <p className="text-sm text-muted-foreground">
              공연 링크를 받으면 여기에서 예매 현황과 입장 QR을 볼 수 있어요.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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

            return (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium truncate">
                          {event?.title ?? "알 수 없는 공연"}
                        </p>
                        {event?.event_date && (
                          <p className="text-sm text-muted-foreground">
                            {formatKST(event.event_date)}
                          </p>
                        )}
                        {event?.venue && (
                          <p className="text-sm text-muted-foreground">
                            {event.venue}
                          </p>
                        )}
                      </div>
                      <BookingStatusBadge
                        status={status}
                        isFree={isFree}
                        className="shrink-0"
                      />
                    </div>
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
