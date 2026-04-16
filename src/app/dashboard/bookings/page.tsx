import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Ticket } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const BOOKING_STATUS_MAP = {
  pending: { label: "입금대기", variant: "secondary" },
  confirmed: { label: "참석확정", variant: "default" },
  cancelled: { label: "취소", variant: "outline" },
} as const;

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko });
  } catch {
    return dateStr;
  }
}

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*, events(id, title, event_date, venue, slug)")
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
            } | null;

            const status = booking.status as keyof typeof BOOKING_STATUS_MAP;
            const statusInfo =
              BOOKING_STATUS_MAP[status] ?? BOOKING_STATUS_MAP.pending;

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
                            {formatDate(event.event_date)}
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
                          statusInfo.variant as
                            | "secondary"
                            | "default"
                            | "outline"
                        }
                        className="shrink-0"
                      >
                        {statusInfo.label}
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
