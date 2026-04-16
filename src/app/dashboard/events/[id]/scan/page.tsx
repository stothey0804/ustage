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

  const { data: event } = await supabase
    .from("events")
    .select("id, title, performer_id")
    .eq("id", id)
    .eq("performer_id", user.id)
    .single();

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/dashboard/events/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          이벤트 상세
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
