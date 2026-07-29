import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatKST } from "@/lib/date";
import {
  ChevronLeft,
  Edit,
  QrCode,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Banknote,
  Phone,
  Clock,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { autoTransitionStatus } from "@/lib/auto-status";
import { sanitizeEventHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/StatusBadge";
import { RichTextView } from "@/components/RichTextView";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusTransition } from "@/components/dashboard/StatusTransition";
import { EventLifecycle } from "@/components/dashboard/EventLifecycle";
import { BookingLinkButton } from "@/components/dashboard/BookingLinkButton";
import { EventQrShare } from "@/components/dashboard/EventQrShare";
import { BookingTable } from "@/components/dashboard/BookingTable";
import {
  DrawPanel,
  type PastDrawRound,
} from "@/components/dashboard/DrawPanel";
import { maskEmail, maskName } from "@/lib/mask";
import { DeleteEventButton } from "@/components/dashboard/DeleteEventButton";

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

  // 자동 상태 전환
  const newStatus = await autoTransitionStatus(event);
  if (newStatus) event.status = newStatus;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, booking_tickets(*)")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const bookingCount = bookings?.length ?? 0;
  // 좌석 점유는 예매 API와 같은 기준으로: 취소 제외, 매수(quantity) 합산
  const seatCount = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + (b.quantity ?? 1), 0);

  const status = (event.status ?? "draft") as
    | "draft"
    | "open"
    | "closed"
    | "ended";

  const cancelPolicyHtml = event.cancel_policy
    ? sanitizeEventHtml(event.cancel_policy)
    : undefined;

  // 추첨 대상 = 취소되지 않고 티켓 1장 이상 입장 완료된 예매 (lib/lottery와 같은 기준)
  const drawCandidates = (bookings ?? []).filter(
    (b) =>
      b.status !== "cancelled" &&
      (b.booking_tickets ?? []).some((t) => t.checked_in)
  );
  const drawCandidateNos = drawCandidates
    .map((b) => b.booking_no)
    .filter((no): no is number => typeof no === "number")
    .sort((a, b) => a - b);

  // 지난 추첨 기록 — 예매가 삭제돼도 booking_no 스냅샷으로 회차를 보여준다
  const { data: drawRows } = await supabase
    .from("event_draws")
    .select("round, booking_no, booking_id")
    .eq("event_id", id)
    .order("round", { ascending: false });

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const roundMap = new Map<number, PastDrawRound["winners"]>();
  for (const row of drawRows ?? []) {
    const booking = row.booking_id ? bookingById.get(row.booking_id) : undefined;
    const winners = roundMap.get(row.round) ?? [];
    winners.push({
      bookingNo: row.booking_no,
      maskedName: booking ? maskName(booking.name) : "?",
      maskedEmail: booking?.email ? maskEmail(booking.email) : "?",
    });
    roundMap.set(row.round, winners);
  }
  const pastRounds: PastDrawRound[] = [...roundMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([round, winners]) => ({ round, winners }));

  return (
    <div className="space-y-6">
      {/* 헤더 — 상태·일시·장소를 제목 위에 두고 액션은 우측 정렬 (데스크톱 기준) */}
      <div>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          내 스테이지
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <EventStatusBadge status={event.status} />
          <span className="text-xs text-muted-foreground">
            {formatKST(event.event_date)} · {event.venue}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight leading-snug">
          {event.title}
        </h1>
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
        <EventQrShare slug={event.slug} title={event.title} />
        <DeleteEventButton eventId={id} hasBookings={bookingCount > 0} />
      </div>

      {/* 진행 상태 흐름 + 상태 전환 — 넓은 화면에서 늘어지지 않게 폭을 제한 */}
      <div className="max-w-3xl space-y-6">
        <EventLifecycle event={event} />
        <StatusTransition eventId={id} currentStatus={status} />
      </div>

      <Separator />

      {/* 탭: 예매 명단(주 작업) / 스테이지 정보 */}
      <Tabs defaultValue={bookingCount > 0 ? "bookings" : "info"}>
        <TabsList className="w-full max-w-lg">
          <TabsTrigger value="bookings" className="flex-1">
            예매 명단 ({bookingCount})
          </TabsTrigger>
          <TabsTrigger value="draw" className="flex-1">
            추첨
          </TabsTrigger>
          <TabsTrigger value="info" className="flex-1">
            스테이지 정보
          </TabsTrigger>
        </TabsList>

        {/* 스테이지 정보 탭 */}
        <TabsContent value="info" className="mt-4 max-w-3xl space-y-6">
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
            <InfoRow
              icon={Calendar}
              label="일시"
              value={
                event.event_end_date
                  ? `${formatKST(event.event_date)} ~ ${formatKST(event.event_end_date, "HH:mm")}`
                  : formatKST(event.event_date)
              }
            />
            <InfoRow icon={MapPin} label="장소" value={event.venue} />
            <InfoRow
              icon={Banknote}
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
                value={`${event.capacity}석 (예매 ${seatCount}석)`}
              />
            )}
            {event.booking_start && (
              <InfoRow
                icon={Clock}
                label="예매 시작"
                value={formatKST(event.booking_start)}
              />
            )}
            {event.booking_end && (
              <InfoRow
                icon={Clock}
                label="예매 종료"
                value={formatKST(event.booking_end)}
              />
            )}
            <InfoRow icon={Banknote} label="입금 계좌" value={event.bank_info} />
            <InfoRow icon={Phone} label="연락처" value={event.contact} />
          </div>

          {/* 취소·환불 규정 */}
          {cancelPolicyHtml && (
            <>
              <Separator />
              <div>
                <h2 className="text-sm font-semibold mb-3">취소·환불 규정</h2>
                <RichTextView
                  html={cancelPolicyHtml}
                  className="rounded-lg border bg-muted/30 px-3.5 py-3 text-muted-foreground"
                />
              </div>
            </>
          )}

          {/* 안내 내용 */}
          {event.description && (
            <>
              <Separator />
              <div>
                <h2 className="text-sm font-semibold mb-3">스테이지 안내</h2>
                <div
                  className="ck-content text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: sanitizeEventHtml(event.description) }}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* 예매 명단 탭 */}
        <TabsContent value="bookings" className="mt-4">
          <BookingTable
            initialBookings={bookings ?? []}
            eventId={id}
            eventTitle={event.title}
            isFree={event.price === 0}
            price={event.price}
            capacity={event.capacity}
            customFields={(event.custom_fields ?? []) as import("@/lib/validations/event").CustomField[]}
            cancelPolicyHtml={cancelPolicyHtml}
          />
        </TabsContent>

        {/* 추첨 탭 */}
        <TabsContent value="draw" className="mt-4">
          <DrawPanel
            eventId={id}
            candidateCount={drawCandidates.length}
            candidateNos={drawCandidateNos}
            pastRounds={pastRounds}
          />
        </TabsContent>
      </Tabs>
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
