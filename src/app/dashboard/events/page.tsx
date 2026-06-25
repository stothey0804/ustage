import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/StatusBadge";

function formatEventDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "yyyy. M. d. (EEE) HH:mm", { locale: ko });
  } catch {
    return dateStr;
  }
}

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, event_date, venue, status, capacity, slug")
    .eq("performer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[events list]", error);
    throw new Error("이벤트 목록을 불러오지 못했습니다.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">내 이벤트</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="size-4 mr-1.5" />
            이벤트 추가
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">아직 만든 이벤트가 없어요</p>
            <p className="text-sm text-muted-foreground">
              첫 공연을 등록하고 예매 링크를 공유해 보세요.
            </p>
          </div>
          <Button asChild className="mt-1">
            <Link href="/dashboard/events/new">
              <Plus className="size-4" />
              이벤트 만들기
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            return (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {event.title}
                      </CardTitle>
                      <EventStatusBadge status={event.status} className="mt-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {formatEventDate(event.event_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {event.venue}
                    </span>
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {event.capacity}석
                      </span>
                    )}
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
