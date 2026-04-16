import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { formatKST } from "@/lib/date";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function getStatusLabel(status: string, isFree: boolean) {
  if (status === "confirmed") return isFree ? "참가확정" : "입금완료";
  if (status === "cancelled") return "취소";
  return "입금대기";
}

function getStatusVariant(status: string) {
  if (status === "confirmed") return "default";
  if (status === "cancelled") return "outline";
  return "secondary";
}

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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Ticket className="size-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            아직 예약한 공연이 없어요.
          </p>
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
                      <Badge
                        variant={
                          getStatusVariant(status) as
                            | "secondary"
                            | "default"
                            | "outline"
                        }
                        className="shrink-0"
                      >
                        {getStatusLabel(status, isFree)}
                      </Badge>
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
