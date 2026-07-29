"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Check,
  Download,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import {
  deleteBooking,
  forceCheckIn,
  resendBookingConfirmation,
  resetBookingPassword,
  updateBookingStatus,
  updateBookingStatusBulk,
} from "@/app/actions/booking";
import {
  formatBookingNoRange,
  matchesBookingNoRange,
} from "@/lib/booking-code";
import {
  buildBookingsCsv,
  bookingStatusLabel,
  downloadCsv,
} from "@/lib/bookings-csv";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { RichTextView } from "@/components/RichTextView";
import { OnsiteBookingDialog } from "@/components/dashboard/OnsiteBookingDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomField } from "@/lib/validations/event";

type BookingRow = Tables<"bookings"> & {
  booking_tickets?: Tables<"booking_tickets">[];
};

interface Props {
  initialBookings: BookingRow[];
  eventId: string;
  eventTitle: string;
  isFree: boolean;
  /** 1매 가격 (원) */
  price: number;
  /** 좌석 한도 — 없으면 무제한 */
  capacity: number | null;
  customFields?: CustomField[];
  /** 취소·환불 규정 — 서버에서 sanitize된 HTML */
  cancelPolicyHtml?: string;
}

type FilterKey =
  | "all"
  | "pending"
  | "confirmed"
  | "checked_in"
  | "not_checked_in"
  | "cancelled";

type SortKey = "created" | "name";
type SortDir = "asc" | "desc";

/** 명단 테이블 컬럼 폭 — 헤더와 데이터 행이 공유한다. */
const COLUMNS =
  "40px minmax(160px, 1fr) 116px 56px 100px 140px 116px 96px 104px";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function ticketStats(booking: BookingRow) {
  const tickets = (booking.booking_tickets ?? [])
    .slice()
    .sort((a, b) => a.ticket_number - b.ticket_number);
  const quantity = booking.quantity ?? 1;
  const checkedIn = tickets.filter((t) => t.checked_in).length;
  return {
    tickets,
    quantity,
    checkedIn,
    allCheckedIn: tickets.length > 0 && checkedIn === quantity,
    noneCheckedIn: tickets.length === 0 || checkedIn === 0,
  };
}

function formatCreated(value: string | null, withYear = false): string {
  if (!value) return "-";
  try {
    return format(new Date(value), withYear ? "yyyy년 M월 d일 HH:mm" : "M월 d일 HH:mm", {
      locale: ko,
    });
  } catch {
    return value;
  }
}

/** 가장 오래된 입금대기 건의 경과일 — 요약 카드 서브 문구 */
function oldestPendingDays(bookings: BookingRow[]): number | null {
  const dates = bookings
    .filter((b) => b.status === "pending" && b.created_at)
    .map((b) => new Date(b.created_at!).getTime())
    .filter((t) => !isNaN(t));
  if (dates.length === 0) return null;
  const oldest = Math.min(...dates);
  return Math.floor((Date.now() - oldest) / (24 * 60 * 60 * 1000));
}

export function BookingTable({
  initialBookings,
  eventId,
  eventTitle,
  isFree,
  price,
  capacity,
  customFields,
  cancelPolicyHtml,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(
    initialBookings[0]?.id ?? null
  );

  const [cancelTarget, setCancelTarget] = useState<string[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPw, setResetPw] = useState("");

  const fieldLabelMap = useMemo(
    () => Object.fromEntries((customFields ?? []).map((f) => [f.id, f.label])),
    [customFields]
  );

  /* ─── 집계 ─── */

  const stats = useMemo(() => {
    const active = initialBookings.filter((b) => b.status !== "cancelled");
    const confirmed = initialBookings.filter((b) => b.status === "confirmed");
    const pending = initialBookings.filter((b) => b.status === "pending");
    const cancelled = initialBookings.filter((b) => b.status === "cancelled");
    const seats = (rows: BookingRow[]) =>
      rows.reduce((sum, b) => sum + (b.quantity ?? 1), 0);

    const checkedInCount = initialBookings.filter(
      (b) => b.status !== "cancelled" && ticketStats(b).allCheckedIn
    ).length;
    const notCheckedInCount = initialBookings.filter(
      (b) => b.status === "confirmed" && ticketStats(b).noneCheckedIn
    ).length;

    return {
      total: initialBookings.length,
      activeTickets: seats(active),
      confirmedCount: confirmed.length,
      confirmedSeats: seats(confirmed),
      confirmedAmount: price * seats(confirmed),
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
      checkedInCount,
      notCheckedInCount,
      oldestPending: oldestPendingDays(initialBookings),
    };
  }, [initialBookings, price]);

  const counts: Record<FilterKey, number> = {
    all: stats.total,
    pending: stats.pendingCount,
    confirmed: stats.confirmedCount,
    checked_in: stats.checkedInCount,
    not_checked_in: stats.notCheckedInCount,
    cancelled: stats.cancelledCount,
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "전체" },
    ...(isFree ? [] : [{ key: "pending" as FilterKey, label: "입금대기" }]),
    { key: "confirmed", label: isFree ? "참가확정" : "입금완료" },
    { key: "checked_in", label: "입장완료" },
    { key: "not_checked_in", label: "미입장" },
    { key: "cancelled", label: "취소" },
  ];

  /* ─── 필터·검색·정렬 ─── */

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = initialBookings.filter((b) => {
      const { allCheckedIn, noneCheckedIn } = ticketStats(b);
      let statusMatch: boolean;
      if (filter === "all") statusMatch = true;
      else if (filter === "checked_in")
        statusMatch = allCheckedIn && b.status !== "cancelled";
      else if (filter === "not_checked_in")
        statusMatch = noneCheckedIn && b.status === "confirmed";
      else statusMatch = b.status === filter;
      if (!statusMatch) return false;

      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.email ?? "").toLowerCase().includes(q) ||
        b.depositor_name.toLowerCase().includes(q) ||
        matchesBookingNoRange(b.booking_no, b.quantity ?? 1, b.id, query)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return list.slice().sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko") * dir;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "") * dir;
    });
  }, [initialBookings, filter, query, sortKey, sortDir]);

  const visibleIds = visible.map((b) => b.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const selectedRows = initialBookings.filter((b) => selected.includes(b.id));
  const detail = initialBookings.find((b) => b.id === detailId) ?? null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  }

  function resetSelection() {
    setSelected([]);
  }

  /* ─── 액션 ─── */

  function runStatus(ids: string[], status: "pending" | "confirmed" | "cancelled") {
    startTransition(async () => {
      const result =
        ids.length === 1
          ? await updateBookingStatus(ids[0], status)
          : await updateBookingStatusBulk(ids, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === "confirmed"
          ? `입금 확인 ${ids.length}건 처리했습니다.`
          : status === "cancelled"
            ? `취소 ${ids.length}건 처리했습니다.`
            : "입금 확인을 되돌렸습니다."
      );
      resetSelection();
      router.refresh();
    });
  }

  function resendConfirmed(ids: string[]) {
    const targets = initialBookings.filter(
      (b) => ids.includes(b.id) && b.status === "confirmed"
    );
    if (targets.length === 0) {
      toast.error("입금이 확인된 예매만 확정 메일을 보낼 수 있습니다.");
      return;
    }
    startTransition(async () => {
      let sent = 0;
      for (const target of targets) {
        const result = await resendBookingConfirmation(target.id);
        if (result.error) {
          toast.error(`${target.name}: ${result.error}`);
          continue;
        }
        sent += 1;
      }
      if (sent > 0) toast.success(`확정 메일 ${sent}건을 발송했습니다.`);
      resetSelection();
    });
  }

  function runCheckIn(bookingId: string, ticketId?: string) {
    startTransition(async () => {
      const result = await forceCheckIn(bookingId, ticketId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("입장 처리되었습니다.");
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deleteBooking(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (detailId === id) setDetailId(null);
      toast.success("예매가 삭제되었습니다.");
      router.refresh();
    });
  }

  function confirmReset() {
    if (!resetTarget) return;
    if (resetPw.trim().length < 4) {
      toast.error("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    const { id } = resetTarget;
    const pw = resetPw.trim();
    startTransition(async () => {
      const result = await resetBookingPassword(id, pw);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("비밀번호가 초기화되었습니다.");
      setResetTarget(null);
      setResetPw("");
    });
  }

  function exportCsv() {
    if (visible.length === 0) {
      toast.error("다운로드할 명단이 없습니다.");
      return;
    }
    const date = format(new Date(), "yyyyMMdd", { locale: ko });
    const safeTitle = (eventTitle || "스테이지").replace(/[\\/:*?"<>|]/g, "_");
    const csv = buildBookingsCsv(visible, customFields ?? [], { isFree, price });
    downloadCsv(`${safeTitle}_신청자명단_${date}.csv`, csv);
  }

  const seatPercent =
    capacity && capacity > 0
      ? Math.min(Math.round((stats.confirmedSeats / capacity) * 100), 100)
      : null;

  return (
    <div className="space-y-6">
      {/* 요약 지표 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="총 예매"
          value={`${stats.total}건`}
          sub={`티켓 ${stats.activeTickets}매`}
        />
        <StatCard
          label={isFree ? "참가확정" : "입금완료"}
          value={`${stats.confirmedCount}건`}
          valueClassName="text-primary"
          sub={
            isFree
              ? `좌석 ${stats.confirmedSeats}석 확정`
              : `${won(stats.confirmedAmount)} 입금`
          }
        />
        {isFree ? (
          <StatCard
            label="입장완료"
            value={`${stats.checkedInCount}건`}
            sub={`미입장 ${stats.notCheckedInCount}건`}
          />
        ) : (
          <StatCard
            label="입금대기"
            value={`${stats.pendingCount}건`}
            sub={
              stats.oldestPending === null
                ? "대기 중인 건이 없어요"
                : stats.oldestPending === 0
                  ? "가장 오래된 건 오늘 신청"
                  : `가장 오래된 건 ${stats.oldestPending}일 경과`
            }
          />
        )}
        <StatCard
          label="좌석"
          value={
            capacity ? `${stats.confirmedSeats} / ${capacity}석` : `${stats.confirmedSeats}석`
          }
          sub={capacity ? undefined : "좌석 한도 없음"}
          progress={seatPercent}
        />
      </div>

      {/* 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  resetSelection();
                }}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label} {counts[f.key]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Input
            className="w-60"
            placeholder="이름 · 예매번호 · 입금자명 검색"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetSelection();
            }}
          />
          <OnsiteBookingDialog eventId={eventId} isFree={isFree} price={price} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={exportCsv}
          >
            <Download className="size-3.5" />
            명단 내보내기
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        {/* 테이블 */}
        <div className="w-full min-w-0 overflow-hidden rounded-4xl bg-card shadow-md ring-1 ring-foreground/5 xl:flex-1">
          <div className="overflow-x-auto">
            <div className="min-w-[1064px]">
              {/* 일괄 처리 바 */}
              <div
                className={cn(
                  "flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3 transition-colors",
                  selected.length > 0 && "bg-primary/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <CheckBox
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? [] : visibleIds)
                    }
                    label="표시된 예매 전체 선택"
                  />
                  <span className="text-[13px] font-medium">
                    {selected.length > 0
                      ? `${selected.length}건 선택`
                      : "전체 선택"}
                  </span>
                </div>

                {selected.length > 0 && (
                  <div className="flex gap-2">
                    {!isFree && (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={() => runStatus(selected, "confirmed")}
                      >
                        입금 확인
                      </Button>
                    )}
                    {isFree && (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={() => runStatus(selected, "confirmed")}
                      >
                        참가 확정
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => resendConfirmed(selected)}
                    >
                      <Mail className="size-3.5" />
                      확정 메일 보내기
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={isPending}
                      onClick={() => setCancelTarget(selected)}
                    >
                      취소 처리
                    </Button>
                  </div>
                )}
              </div>

              {/* 헤더 행 */}
              <div
                className="grid h-10 items-center border-b px-5 text-xs text-muted-foreground"
                style={{ gridTemplateColumns: COLUMNS }}
              >
                <span />
                <button
                  type="button"
                  className="text-left hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  예매자
                  {sortKey === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </button>
                <span>예매번호</span>
                <span>매수</span>
                <span>{isFree ? "참가비" : "금액"}</span>
                <span>입금자명</span>
                <button
                  type="button"
                  className="text-left hover:text-foreground"
                  onClick={() => toggleSort("created")}
                >
                  신청일시
                  {sortKey === "created" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </button>
                <span>상태</span>
                <span />
              </div>

              {/* 데이터 행 */}
              {visible.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                  {initialBookings.length === 0
                    ? "아직 예매가 없습니다."
                    : "조건에 맞는 예매가 없습니다."}
                </div>
              ) : (
                visible.map((booking) => {
                  const { quantity, checkedIn, allCheckedIn } =
                    ticketStats(booking);
                  const isSelected = selected.includes(booking.id);
                  const isDetail = detailId === booking.id;

                  return (
                    <div
                      key={booking.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailId(booking.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailId(booking.id);
                        }
                      }}
                      className={cn(
                        "grid cursor-pointer items-center border-b px-5 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-primary/8"
                          : booking.status === "pending"
                            ? "bg-input/40 hover:bg-input/60"
                            : "hover:bg-muted/50",
                        isDetail && "ring-1 ring-inset ring-primary/30"
                      )}
                      style={{ gridTemplateColumns: COLUMNS }}
                    >
                      <CheckBox
                        checked={isSelected}
                        label={`${booking.name} 선택`}
                        onChange={(event) => {
                          event.stopPropagation();
                          setSelected((prev) =>
                            prev.includes(booking.id)
                              ? prev.filter((id) => id !== booking.id)
                              : [...prev, booking.id]
                          );
                        }}
                      />

                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium">
                          {booking.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {booking.email ?? "-"}
                        </span>
                      </div>

                      <span className="font-mono text-xs text-muted-foreground">
                        {formatBookingNoRange(
                          booking.booking_no,
                          quantity,
                          booking.id
                        )}
                      </span>
                      <span className="text-[13px]">{quantity}매</span>
                      <span className="text-[13px]">
                        {isFree
                          ? "무료"
                          : booking.status === "cancelled"
                            ? "—"
                            : won(price * quantity)}
                      </span>

                      <span className="truncate text-[13px]">
                        {isFree ? "—" : booking.depositor_name}
                      </span>

                      <span className="text-[13px] text-muted-foreground">
                        {formatCreated(booking.created_at)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <BookingStatusBadge
                          status={booking.status}
                          isFree={isFree}
                        />
                        {checkedIn > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {allCheckedIn ? "입장" : `${checkedIn}/${quantity}`}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-end">
                        {booking.status === "pending" && (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              runStatus([booking.id], "confirmed");
                            }}
                          >
                            {isFree ? "참가 확정" : "입금 확인"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* 푸터 */}
              <div className="flex items-center justify-between px-5 py-3.5 text-xs text-muted-foreground">
                <span>
                  총 {visible.length}건 표시 ·{" "}
                  {isFree ? "참가확정" : "입금완료"} {stats.confirmedCount}건
                  {!isFree && ` · 입금대기 ${stats.pendingCount}건`}
                </span>
                <span>
                  {isFree
                    ? "참가 확정은 되돌릴 수 있습니다."
                    : "입금 확인은 되돌릴 수 있습니다."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 패널 */}
        <div className="w-full shrink-0 rounded-4xl bg-card p-6 shadow-md ring-1 ring-foreground/5 xl:w-[360px]">
          {detail ? (
            <DetailPanel
              booking={detail}
              isFree={isFree}
              price={price}
              isPending={isPending}
              fieldLabelMap={fieldLabelMap}
              onConfirm={() => runStatus([detail.id], "confirmed")}
              onRevert={() => runStatus([detail.id], "pending")}
              onResend={() => resendConfirmed([detail.id])}
              onCancel={() => setCancelTarget([detail.id])}
              onCheckIn={runCheckIn}
              onResetPassword={() =>
                setResetTarget({ id: detail.id, name: detail.name })
              }
              onDelete={() =>
                setDeleteTarget({ id: detail.id, name: detail.name })
              }
            />
          ) : (
            <div className="space-y-2 py-10 text-center">
              <p className="text-sm font-medium">예매자를 선택해주세요</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                행을 누르면 예매 내역과 입금·입장 진행을 여기에서 확인할 수
                있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 취소 확인 */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>예매 취소</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {cancelTarget?.length === 1
                ? `${initialBookings.find((b) => b.id === cancelTarget[0])?.name ?? ""}님의 예매를 취소 처리합니다.`
                : `선택한 ${cancelTarget?.length ?? 0}건을 취소 처리합니다.`}{" "}
              발급된 입장 QR은 사용할 수 없게 되고 좌석은 반환됩니다. 참석자에게
              취소 안내 메일이 발송됩니다.
            </p>
            {cancelPolicyHtml ? (
              <div className="rounded-3xl border bg-muted/40 px-3.5 py-3">
                <p className="text-xs font-semibold">
                  참석자에게 안내한 취소·환불 규정
                </p>
                <RichTextView
                  html={cancelPolicyHtml}
                  className="mt-2 text-xs text-muted-foreground"
                />
              </div>
            ) : (
              <p className="rounded-3xl border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
                이 스테이지에는 취소·환불 규정이 등록되어 있지 않습니다. 스테이지
                수정에서 규정을 등록하면 참석자에게 신청·취소 시 안내됩니다.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              환불이 필요한 경우 계좌 이체는 직접 처리해야 합니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={isPending}
            >
              닫기
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                const ids = cancelTarget ?? [];
                setCancelTarget(null);
                if (ids.length > 0) runStatus(ids, "cancelled");
              }}
            >
              예매 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예매 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            님의 예매를 삭제하면 복구할 수 없습니다. 기록을 남기려면 삭제 대신
            취소 처리를 사용해 주세요.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 */}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {resetTarget?.name}
              </span>
              님의 예약 조회 비밀번호를 새로 설정합니다. 변경한 비밀번호를
              참석자에게 전달해 주세요.
            </p>
            <Input
              type="password"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder="새 비밀번호 (4자 이상)"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmReset();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetTarget(null)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button onClick={confirmReset} disabled={isPending}>
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── 조각들 ─── */

function StatCard({
  label,
  value,
  sub,
  valueClassName,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  progress?: number | null;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-4xl bg-card px-6 py-5 shadow-md ring-1 ring-foreground/5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-bold", valueClassName)}>{value}</span>
      {progress != null ? (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : sub ? (
        <span className="text-xs text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  );
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "grid size-[18px] place-items-center rounded-md border text-[11px] transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent hover:border-primary/60"
      )}
    >
      {checked && <Check className="size-3" />}
    </button>
  );
}

function DetailPanel({
  booking,
  isFree,
  price,
  isPending,
  fieldLabelMap,
  onConfirm,
  onRevert,
  onResend,
  onCancel,
  onCheckIn,
  onResetPassword,
  onDelete,
}: {
  booking: BookingRow;
  isFree: boolean;
  price: number;
  isPending: boolean;
  fieldLabelMap: Record<string, string>;
  onConfirm: () => void;
  onRevert: () => void;
  onResend: () => void;
  onCancel: () => void;
  onCheckIn: (bookingId: string, ticketId?: string) => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const { tickets, quantity, checkedIn, allCheckedIn } = ticketStats(booking);
  const customAnswers =
    booking.custom_answers &&
    typeof booking.custom_answers === "object" &&
    !Array.isArray(booking.custom_answers)
      ? (booking.custom_answers as Record<string, unknown>)
      : null;

  const checkedInAt = tickets
    .filter((t) => t.checked_in && t.checked_in_at)
    .map((t) => t.checked_in_at!)
    .sort()[0];

  const timeline = [
    { label: "예매 신청", at: formatCreated(booking.created_at), done: true },
    {
      label: isFree ? "참가 확정" : "입금 확인",
      at:
        booking.status === "confirmed"
          ? "확인됨"
          : booking.status === "cancelled"
            ? "취소"
            : "대기",
      done: booking.status === "confirmed",
    },
    {
      label: "입장",
      at: checkedInAt
        ? formatCreated(checkedInAt)
        : allCheckedIn
          ? "완료"
          : "예정",
      done: checkedIn > 0,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{booking.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {booking.email ?? "-"}
          </span>
        </div>
        <div className="ml-auto">
          <BookingStatusBadge status={booking.status} isFree={isFree} />
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-input/50 p-4 text-[13px]">
        <DetailRow
          label="예매번호"
          mono
          value={formatBookingNoRange(booking.booking_no, quantity, booking.id)}
        />
        <DetailRow label="매수" value={`${quantity}매`} />
        {!isFree && (
          <>
            <DetailRow label="금액" value={won(price * quantity)} />
            <DetailRow label="입금자명" value={booking.depositor_name} />
            <DetailRow label="입금예상" value={booking.deposited_at} />
          </>
        )}
        <DetailRow label="신청일시" value={formatCreated(booking.created_at, true)} />
      </div>

      {customAnswers && Object.keys(customAnswers).length > 0 && (
        <div className="space-y-3 rounded-3xl bg-input/50 p-4 text-[13px]">
          {Object.entries(customAnswers).map(([key, value]) => (
            <DetailRow
              key={key}
              label={fieldLabelMap[key] || key}
              value={typeof value === "boolean" ? (value ? "예" : "아니오") : String(value)}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[13px] font-semibold">진행</p>
        {timeline.map((step) => (
          <div key={step.label} className="flex items-baseline gap-2.5">
            <span
              className={cn(
                "size-1.5 shrink-0 -translate-y-px rounded-full",
                step.done ? "bg-primary" : "bg-border"
              )}
            />
            <span className="flex-1 text-[13px]">{step.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {step.at}
            </span>
          </div>
        ))}
      </div>

      {/* 티켓별 입장 현황 */}
      {tickets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold">
            입장 {checkedIn}/{quantity}
          </p>
          <div className="space-y-1.5">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between rounded-3xl border px-3 py-2 text-[13px]"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-primary">
                    #{ticket.attendee_no ?? ticket.ticket_number}
                  </span>
                  {ticket.checked_in ? (
                    <span className="flex items-center gap-1 text-primary">
                      <Check className="size-3.5" /> 입장완료
                    </span>
                  ) : (
                    <span className="text-muted-foreground">미입장</span>
                  )}
                </span>
                {!ticket.checked_in && booking.status === "confirmed" && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="gap-1"
                    disabled={isPending}
                    onClick={() => onCheckIn(booking.id, ticket.id)}
                  >
                    <LogIn className="size-3" />
                    입장처리
                  </Button>
                )}
              </div>
            ))}
          </div>
          {quantity > 1 && !allCheckedIn && booking.status === "confirmed" && (
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={isPending}
              onClick={() => onCheckIn(booking.id)}
            >
              <LogIn className="size-4" />
              전체 입장 처리
            </Button>
          )}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        {booking.status === "pending" && (
          <Button
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isFree ? "참가 확정하기" : "입금 확인하기"}
          </Button>
        )}
        {booking.status === "confirmed" && (
          <>
            <Button
              size="lg"
              className="w-full gap-1.5"
              disabled={isPending}
              onClick={onResend}
            >
              <Mail className="size-4" />
              확정 메일 다시 보내기
            </Button>
            {!isFree && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isPending}
                onClick={onRevert}
              >
                입금확인 되돌리기
              </Button>
            )}
          </>
        )}

        {booking.status !== "cancelled" && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            disabled={isPending}
            onClick={onCancel}
          >
            예매 취소
          </Button>
        )}

        <div className="flex gap-2 pt-1">
          {!booking.user_id && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              disabled={isPending}
              onClick={onResetPassword}
            >
              <KeyRound className="size-3.5" />
              비밀번호 초기화
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1 text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("truncate text-right font-medium", mono && "font-mono font-normal")}>
        {value}
      </span>
    </div>
  );
}
