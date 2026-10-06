import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { copyEventFormValues } from "@/lib/event-copy";
import { EventForm } from "@/components/dashboard/EventForm";
import type { EventFormValues } from "@/lib/validations/event";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ?from=<id> — 내가 만든 스테이지를 복사해 시작한다(스태프로 참여한 스테이지는 제외).
  let copySource: { title: string; values: Partial<EventFormValues> } | null = null;
  if (from) {
    const { data: source, error } = await supabase
      .from("events")
      .select(
        "title, description, booking_notice, cancel_policy, venue, venue_address, venue_lat, venue_lng, price, onsite_price, bank_info, contact, capacity, custom_fields"
      )
      .eq("id", from)
      .eq("performer_id", user.id)
      .maybeSingle();
    if (error) console.error("[events/new] copy source", error);
    if (source) {
      copySource = { title: source.title, values: copyEventFormValues(source) };
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 스테이지
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {copySource ? "스테이지 복사하기" : "새 스테이지 만들기"}
        </h1>
        {copySource && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            ‘{copySource.title}’의 내용·가격·예매 폼을 불러왔어요. 일시와 포스터는
            새로 입력해 주세요.
          </p>
        )}
      </div>

      <EventForm
        mode="create"
        userId={user.id}
        defaultValues={copySource?.values}
      />
    </div>
  );
}
