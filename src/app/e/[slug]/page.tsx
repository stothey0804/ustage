import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatKST } from "@/lib/date";
import {
  Calendar,
  MapPin,
  Banknote,
  Phone,
  Clock,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { autoTransitionStatus } from "@/lib/auto-status";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/booking/BookingForm";
import { AddToCalendar } from "@/components/booking/AddToCalendar";
import { VenueMapLinks } from "@/components/booking/VenueMapLinks";
import type { CustomField } from "@/lib/validations/event";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function getBookingStatus(event: {
  status: string | null;
  booking_start: string | null;
  booking_end: string | null;
}): { isOpen: boolean; reason?: string } {
  if (event.status !== "open") {
    return {
      isOpen: false,
      reason:
        event.status === "closed"
          ? "예매가 마감되었습니다."
          : "아직 예매를 받지 않습니다.",
    };
  }
  const now = new Date();
  if (event.booking_start && new Date(event.booking_start) > now) {
    return {
      isOpen: false,
      reason: `예매는 ${formatKST(event.booking_start)}부터 시작됩니다.`,
    };
  }
  if (event.booking_end && new Date(event.booking_end) < now) {
    return { isOpen: false, reason: "예매 기간이 종료되었습니다." };
  }
  return { isOpen: true };
}

export default async function EventPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 이벤트 조회 (RLS: 누구나 SELECT 가능)
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  // 자동 상태 전환 (예매기간/행사일 경과 시 open→closed)
  const statusChanged = await autoTransitionStatus(supabase, event);
  if (statusChanged) event.status = "closed";

  // 로그인 사용자 확인 (없어도 됨)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { isOpen, reason } = getBookingStatus(event);

  const customFields = (event.custom_fields ?? []) as CustomField[];

  const STATUS_LABELS: Record<string, string> = {
    draft: "오픈 전",
    open: "티켓 오픈",
    closed: "마감",
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* 포스터 */}
      {event.poster_url && (
        <div className="relative w-full overflow-hidden rounded-xl border">
          <Image
            src={event.poster_url}
            alt={`${event.title} 포스터`}
            width={600}
            height={900}
            className="w-full h-auto object-contain bg-muted"
            priority
          />
        </div>
      )}

      {/* 제목 + 상태 */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold leading-snug">{event.title}</h1>
          <Badge
            variant={
              event.status === "open"
                ? "default"
                : event.status === "closed"
                  ? "outline"
                  : "secondary"
            }
            className="shrink-0 mt-1"
          >
            {STATUS_LABELS[event.status ?? "draft"] ?? event.status}
          </Badge>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid gap-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <InfoRow
            icon={Calendar}
            value={
              event.event_end_date
                ? `${formatKST(event.event_date)} ~ ${formatKST(event.event_end_date, "HH:mm")}`
                : formatKST(event.event_date)
            }
          />
          <AddToCalendar
            title={event.title}
            date={event.event_date}
            endDate={event.event_end_date ?? undefined}
            venue={event.venue}
            venueAddress={event.venue_address ?? undefined}
          />
        </div>
        {!event.venue_address && (
          <InfoRow icon={MapPin} value={event.venue} />
        )}
        <InfoRow
          icon={Banknote}
          value={event.price === 0 ? "무료입장" : `${event.price.toLocaleString()}원`}
        />
        {event.capacity && (
          <InfoRow icon={Users} value={`좌석 ${event.capacity}석`} />
        )}
        {(event.booking_start || event.booking_end) && (
          <InfoRow
            icon={Clock}
            value={[
              event.booking_start && `예매 시작: ${formatKST(event.booking_start)}`,
              event.booking_end && `예매 종료: ${formatKST(event.booking_end)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        <ContactRow value={event.contact} />
      </div>

      {/* 지도 링크 (주소가 있는 경우에만) */}
      {event.venue_address && (
        <VenueMapLinks address={event.venue_address} />
      )}

      {/* 안내 내용 */}
      {event.description && (
        <>
          <Separator />
          <div
            className="text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </>
      )}

      <Separator />

      {/* 예매 섹션 */}
      <section className="space-y-4">
        <h2 className="font-semibold">예매하기</h2>
        <BookingForm
          eventId={event.id}
          price={event.price}
          bankInfo={event.bank_info}
          customFields={customFields}
          isLoggedIn={!!user}
          isOpen={isOpen}
          closedReason={reason}
        />
      </section>

      {/* 예약 조회 링크 */}
      <div className="text-center">
        {user ? (
          <Link
            href="/dashboard/bookings"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            내 예약 확인하기
          </Link>
        ) : (
          <Link
            href={`/e/${slug}/me`}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            비회원 예약 조회
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      <span>{value}</span>
    </div>
  );
}

function ContactRow({ value }: { value: string }) {
  const isUrl = /^https?:\/\//.test(value);
  const isPhone = /^[\d\-+() ]{8,}$/.test(value.trim());

  return (
    <div className="flex items-start gap-2.5">
      <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {value}
        </a>
      ) : isPhone ? (
        <a href={`tel:${value.replace(/[^+\d]/g, "")}`} className="text-primary underline underline-offset-2">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}
