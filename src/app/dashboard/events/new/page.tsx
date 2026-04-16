import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/dashboard/EventForm";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 이벤트
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          새 이벤트 만들기
        </h1>
      </div>

      <EventForm mode="create" userId={user.id} />
    </div>
  );
}
