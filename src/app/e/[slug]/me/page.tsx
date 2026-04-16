import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BookingLookup } from "@/components/booking/BookingLookup";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookingLookupPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/e/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          이벤트로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold">비회원 예약 조회</h1>
        <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      </div>

      <BookingLookup eventId={event.id} />
    </div>
  );
}
