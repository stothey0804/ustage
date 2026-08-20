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
import { createAdminClient } from "@/lib/supabase/admin";
import { remainingSeats as seatRemaining } from "@/lib/seats";
import { autoTransitionStatus } from "@/lib/auto-status";
import { getAccountEmail } from "@/lib/account-email";
import { sanitizeEventHtml } from "@/lib/sanitize";
import { EventStatusBadge } from "@/components/StatusBadge";
import { RichTextView } from "@/components/RichTextView";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/booking/BookingForm";
import { AddToCalendar } from "@/components/booking/AddToCalendar";
import { VenueMapLinks } from "@/components/booking/VenueMapLinks";
import type { CustomField } from "@/lib/validations/event";
import { bookingShareMeta } from "@/lib/og-share";

/**
 * 공유 미리보기(OG) — 포스터가 있으면 그 이미지를 그대로 쓴다.
 *
 * 카카오톡·메신저에 링크를 붙였을 때 서비스 로고가 아니라 **그 공연의 포스터**가
 * 보이는 편이 낫다. 포스터가 없으면 images를 비워 루트의 `opengraph-image.tsx`
 * (브랜드 마크 + us.tage)를 그대로 물려받는다.
 *
 * `robots: noindex`는 유지한다 — 비공개 링크라 검색에는 걸리지 않아야 하고,
 * 메신저 크롤러는 이 값과 무관하게 OG를 읽는다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description, poster_url, event_date, venue")
    .eq("slug", slug)
    .single();

  const base: Metadata = { robots: { index: false, follow: false } };
  if (!event) return base;

  const share = bookingShareMeta(event, (iso) => formatKST(iso));

  // 미리보기 **이미지**는 여기서 정하지 않는다 — 파일 기반 메타데이터가
  // generateMetadata보다 우선하므로 openGraph.images를 줘도 무시된다.
  // 포스터 카드는 같은 세그먼트의 opengraph-image.tsx가 그린다.
  return {
    ...base,
    title: share.title,
    description: share.description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: `/e/${slug}`,
      title: share.title,
      description: share.description,
    },
    twitter: {
      // opengraph-image가 1200×630 가로 카드를 만들므로 큰 카드가 맞다
      card: "summary_large_image",
      title: share.title,
      description: share.description,
    },
  };
}

/**
 * 포스터 기준 가로 너비(px). 예매 페이지 본문 폭도 이 값에 맞춘다 —
 * 화면이 이보다 넓으면 이 폭으로 고정, 좁으면 100%(모바일과 동일)로 흐른다.
 * 값을 바꾸면 아래 max-w-[calc(600px+2rem)]도 함께 바꿔야 한다(Tailwind는 정적 클래스만 읽는다).
 */
const POSTER_WIDTH = 600;

function getBookingStatus(event: {
  status: string | null;
  booking_start: string | null;
  booking_end: string | null;
}): { isOpen: boolean; reason?: string } {
  if (event.status !== "open") {
    return {
      isOpen: false,
      reason:
        event.status === "ended"
          ? "스테이지가 종료되었습니다."
          : event.status === "closed"
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

  // 스테이지 조회 (RLS: 누구나 SELECT 가능)
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  // 자동 상태 전환
  const newStatus = await autoTransitionStatus(event);
  if (newStatus) event.status = newStatus;

  // 로그인 사용자 확인 (없어도 됨)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 잔여석 계산 (취소 제외, 매수 합산 — 예매 API와 동일 기준)
  // bookings는 RLS로 익명 조회가 막혀 있어 service_role로 합산만 읽는다
  let remainingSeats: number | null = null;
  if (event.capacity) {
    const admin = createAdminClient();
    const { data: seatRows } = await admin
      .from("bookings")
      .select("status, quantity, cancelled_quantity")
      .eq("event_id", event.id);
    remainingSeats = seatRemaining(seatRows ?? [], event.capacity);
  }

  let { isOpen, reason } = getBookingStatus(event);
  if (isOpen && remainingSeats !== null && remainingSeats <= 0) {
    isOpen = false;
    reason = "좌석이 모두 차서 예매가 마감되었습니다.";
  }

  const customFields = (event.custom_fields ?? []) as CustomField[];
  const cancelPolicyHtml = event.cancel_policy
    ? sanitizeEventHtml(event.cancel_policy)
    : undefined;

  return (
    // 본문 폭은 포스터 기준 너비(POSTER_WIDTH)에 맞춘다 —
    // 그보다 넓은 화면에서는 그 폭으로 고정하고, 좁으면 모바일처럼 100%로 흐른다.
    // (좌우 여백 px-4를 감안해 max-w에 2rem을 더한다)
    <div className="mx-auto w-full max-w-[calc(600px+2rem)] px-4 py-8 space-y-6">
      {/* 포스터 — 기준 너비를 넘겨 확대하지 않고, 좁은 화면에서만 축소된다 */}
      {event.poster_url && (
        <div className="relative w-full overflow-hidden rounded-2xl border">
          <Image
            src={event.poster_url}
            alt={`${event.title} 포스터`}
            width={POSTER_WIDTH}
            height={Math.round(POSTER_WIDTH * 1.5)}
            className="w-full h-auto object-contain bg-muted"
            priority
          />
        </div>
      )}

      {/* 제목 + 상태 */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold leading-snug">{event.title}</h1>
          <EventStatusBadge status={event.status} className="shrink-0 mt-1" />
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
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                잔여 좌석
              </span>
              <span className="font-mono text-sm text-primary">
                {remainingSeats === null
                  ? `${event.capacity}석`
                  : remainingSeats <= 0
                    ? "매진"
                    : `${remainingSeats} / ${event.capacity}석`}
              </span>
            </div>
            {remainingSeats !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(Math.round(((event.capacity - remainingSeats) / event.capacity) * 100), 100)}%`,
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              신청 순서대로 좌석이 선점되며, 입금이 확인되면 확정됩니다.
            </p>
          </div>
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
            dangerouslySetInnerHTML={{ __html: sanitizeEventHtml(event.description) }}
          />
        </>
      )}

      {/* 취소·환불 규정 */}
      {cancelPolicyHtml && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="font-semibold">취소·환불 규정</h2>
            <RichTextView
              html={cancelPolicyHtml}
              className="rounded-lg border bg-muted/30 px-3.5 py-3 text-muted-foreground"
            />
          </section>
        </>
      )}

      <Separator />

      {/* 예매 섹션 */}
      <section className="space-y-4">
        <h2 className="font-semibold">예매하기</h2>
        <BookingForm
          eventId={event.id}
          eventTitle={event.title}
          eventDateLabel={formatKST(event.event_date)}
          price={event.price}
          bankInfo={event.bank_info}
          noticeHtml={
            event.booking_notice
              ? sanitizeEventHtml(event.booking_notice)
              : undefined
          }
          cancelPolicyHtml={cancelPolicyHtml}
          customFields={customFields}
          isLoggedIn={!!user}
          userEmail={getAccountEmail(user) ?? undefined}
          isOpen={isOpen}
          closedReason={reason}
          maxQuantity={
            remainingSeats === null ? 20 : Math.max(Math.min(20, remainingSeats), 1)
          }
        />
      </section>

      {/* 예약 조회 링크 */}
      <div className="text-center">
        {user ? (
          <Link
            href="/dashboard/bookings"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            내 티켓 확인하기
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
