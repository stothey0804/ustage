import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { QrScanner } from "@/components/dashboard/QrScanner";

export default async function ScanPage({
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

  // 소유자 또는 스태프면 입장 확인을 할 수 있다
  const { data: event } = await supabase
    .from("events")
    .select("id, title, performer_id")
    .eq("id", id)
    .single();

  if (!event) notFound();

  if (event.performer_id !== user.id) {
    const { data: staffRow } = await supabase
      .from("event_staff")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();
    if (!staffRow) notFound();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          스테이지 상세
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          QR 입장확인
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{event.title}</p>
      </div>

      <QrScanner eventId={id} />
    </div>
  );
}
