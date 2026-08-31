import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BookingLookup } from "@/components/booking/BookingLookup";

// 폐쇄형 페이지 — 검색 노출 금지
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookingLookupPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, price")
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
          스테이지로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold">비회원 예약 조회</h1>
        <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      </div>

      <BookingLookup eventId={event.id} />

      {/* 회원으로 예매했다면 비밀번호 조회가 아니라 로그인이 맞다 — 통로를 함께 둔다
          (회원 예매는 password_hash가 빈 값이라 이 화면에서는 찾을 수 없다) */}
      <p className="text-center text-xs text-muted-foreground">
        로그인해서 예매하셨나요?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(`/e/${slug}`)}`}
          className="font-medium underline underline-offset-2 hover:text-foreground"
        >
          로그인하고 내 티켓 보기
        </Link>
      </p>
    </div>
  );
}
