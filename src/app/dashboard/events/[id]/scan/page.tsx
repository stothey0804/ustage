import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, QrCode } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

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

      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
        <QrCode className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          QR 스캔 기능은 M6에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}
