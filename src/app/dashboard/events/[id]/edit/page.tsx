import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/dashboard/EventForm";
import type { EventFormValues } from "@/lib/validations/event";

function toDatetimeLocal(isoStr: string | null): string | undefined {
  if (!isoStr) return undefined;
  // Convert ISO string to "YYYY-MM-DDTHH:mm" for datetime-local input
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("performer_id", user.id)
    .single();

  if (!event) notFound();

  const defaultValues: Partial<EventFormValues> = {
    title: event.title,
    description: event.description ?? "",
    poster_url: event.poster_url ?? "",
    event_date: toDatetimeLocal(event.event_date) ?? "",
    venue: event.venue,
    price: event.price,
    bank_info: event.bank_info,
    contact: event.contact,
    capacity: event.capacity ?? undefined,
    booking_start: toDatetimeLocal(event.booking_start) ?? undefined,
    booking_end: toDatetimeLocal(event.booking_end) ?? undefined,
    custom_fields: (event.custom_fields as EventFormValues["custom_fields"]) ?? [],
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          이벤트 상세
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          이벤트 수정
        </h1>
      </div>

      <EventForm
        mode="edit"
        eventId={id}
        userId={user.id}
        defaultValues={defaultValues}
      />
    </div>
  );
}
