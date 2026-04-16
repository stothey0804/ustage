import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  Edit,
  QrCode,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Phone,
  Clock,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusTransition } from "@/components/dashboard/StatusTransition";
import { BookingLinkButton } from "@/components/dashboard/BookingLinkButton";
import { BookingList } from "@/components/dashboard/BookingList";

const STATUS_MAP = {
  draft: { label: "오픈 전", variant: "secondary" },
  open: { label: "티켓 오픈", variant: "default" },
  closed: { label: "마감", variant: "outline" },
} as const;

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "yyyy년 M월 d일 (EEE) HH:mm", {
      locale: ko,
    });
  } catch {
    return dateStr;
  }
}

export default async function EventDetailPage({
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

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const bookingCount = bookings?.length ?? 0;

  const status = (event.status ?? "draft") as keyof typeof STATUS_MAP;
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.draft;
  const bookingUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("supabase.co", "") ?? ""}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 헤더 */}
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 이벤트
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight leading-snug">
            {event.title}
          </h1>
          <Badge
            variant={
              statusInfo.variant as "secondary" | "default" | "outline"
            }
            className="shrink-0 mt-0.5"
          >
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/events/${id}/edit`}>
            <Edit className="size-4 mr-1.5" />
            수정
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/events/${id}/scan`}>
            <QrCode className="size-4 mr-1.5" />
            QR 스캔
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/e/${event.slug}`} target="_blank">
            <ExternalLink className="size-4 mr-1.5" />
            예매 페이지
          </Link>
        </Button>
        <BookingLinkButton slug={event.slug} />
      </div>

      {/* 상태 전환 */}
      <StatusTransition eventId={id} currentStatus={status} event={event} />

      <Separator />

      {/* 포스터 */}
      {event.poster_url && (
        <div className="relative h-64 w-full overflow-hidden rounded-lg border sm:h-80">
          <Image
            src={event.poster_url}
            alt={`${event.title} 포스터`}
            fill
            className="object-contain bg-muted"
          />
        </div>
      )}

      {/* 기본 정보 */}
      <div className="grid gap-3 text-sm">
        <InfoRow icon={Calendar} label="일시" value={formatDate(event.event_date)} />
        <InfoRow icon={MapPin} label="장소" value={event.venue} />
        <InfoRow
          icon={CreditCard}
          label="가격"
          value={
            event.price === 0
              ? "무료"
              : `${event.price.toLocaleString()}원`
          }
        />
        {event.capacity && (
          <InfoRow
            icon={Users}
            label="좌석"
            value={`${event.capacity}석 (현재 ${bookingCount ?? 0}명 예매)`}
          />
        )}
        {event.booking_start && (
          <InfoRow
            icon={Clock}
            label="예매 시작"
            value={formatDate(event.booking_start)}
          />
        )}
        {event.booking_end && (
          <InfoRow
            icon={Clock}
            label="예매 종료"
            value={formatDate(event.booking_end)}
          />
        )}
        <InfoRow icon={CreditCard} label="입금 계좌" value={event.bank_info} />
        <InfoRow icon={Phone} label="연락처" value={event.contact} />
      </div>

      {/* 안내 내용 */}
      {event.description && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold mb-3">공연 안내</h2>
            <div
              className="ck-content text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        </>
      )}

      <Separator />

      {/* 예매 명단 */}
      <div>
        <h2 className="text-sm font-semibold mb-4">예매 명단</h2>
        <BookingList eventId={id} initialBookings={bookings ?? []} />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
