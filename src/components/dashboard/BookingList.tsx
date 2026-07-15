"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Check, ChevronRight, LogIn, KeyRound, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { updateBookingStatus, deleteBooking, forceCheckIn, resetBookingPassword } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CustomField } from "@/lib/validations/event";

type BookingWithTickets = Tables<"bookings"> & {
  booking_tickets?: Tables<"booking_tickets">[];
};

interface BookingListProps {
  initialBookings: BookingWithTickets[];
  isFree?: boolean;
  /** 1매 가격 (원) — 예매별 입금액 표시용 */
  price?: number;
  customFields?: CustomField[];
  /** 다운로드 파일명에 사용 */
  eventTitle?: string;
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled" | "checked_in" | "not_checked_in";

function getStatusFilters(isFree: boolean): { value: FilterStatus; label: string }[] {
  return [
    { value: "all", label: "전체" },
    ...(!isFree ? [{ value: "pending" as FilterStatus, label: "입금대기" }] : []),
    { value: "confirmed", label: isFree ? "참가확정" : "입금완료" },
    { value: "checked_in", label: "입장완료" },
    { value: "not_checked_in", label: "미입장" },
    { value: "cancelled", label: "취소" },
  ];
}

function formatCreatedAt(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "M월 d일 HH:mm", { locale: ko });
  } catch {
    return dateStr;
  }
}

/** custom_fields의 id → label 매핑 생성 */
function buildFieldLabelMap(fields?: CustomField[]): Record<string, string> {
  if (!fields) return {};
  return Object.fromEntries(fields.map((f) => [f.id, f.label]));
}

function bookingStatusLabel(status: string, isFree: boolean): string {
  if (status === "confirmed") return isFree ? "참가확정" : "입금완료";
  if (status === "cancelled") return "취소";
  return "입금대기";
}

/** CSV 셀 이스케이프 — 쉼표/따옴표/개행 포함 시 큰따옴표로 감싼다. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildBookingsCsv(
  bookings: BookingWithTickets[],
  fields: CustomField[],
  opts: { isFree: boolean; price: number },
): string {
  const headers = [
    "이름",
    "이메일",
    "매수",
    "입금자명",
    "입금시간",
    "상태",
    "입장",
    ...(opts.isFree ? [] : ["입금액(원)"]),
    ...fields.map((f) => f.label),
    "신청일시",
  ];
  const lines = bookings.map((b) => {
    const tickets = b.booking_tickets ?? [];
    const checkedIn = tickets.filter((t) => t.checked_in).length;
    const quantity = b.quantity ?? 1;
    const answers = (b.custom_answers ?? {}) as Record<string, unknown>;
    const email = (b as BookingWithTickets & { email?: string }).email ?? "";
    return [
      b.name,
      email,
      quantity,
      b.depositor_name,
      b.deposited_at,
      bookingStatusLabel(b.status, opts.isFree),
      `${checkedIn}/${quantity}`,
      ...(opts.isFree ? [] : [opts.price * quantity]),
      ...fields.map((f) => {
        const v = answers[f.id];
        if (typeof v === "boolean") return v ? "예" : "아니오";
        return v ?? "";
      }),
      b.created_at
        ? format(new Date(b.created_at), "yyyy-MM-dd HH:mm", { locale: ko })
        : "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [headers.map(csvCell).join(","), ...lines].join("\r\n");
}

function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM — Excel에서 한글이 깨지지 않도록
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingList({
  initialBookings,
  isFree = false,
  price = 0,
  customFields,
  eventTitle,
}: BookingListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchName, setSearchName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithTickets | null>(null);
  const [sortBy, setSortBy] = useState<"created" | "name" | "email">("created");

  const fieldLabelMap = buildFieldLabelMap(customFields);

  const filtered = initialBookings
    .filter((b) => {
      const tickets = b.booking_tickets ?? [];
      const allCheckedIn = tickets.length > 0 && tickets.every((t) => t.checked_in);
      const noneCheckedIn = tickets.length === 0 || tickets.every((t) => !t.checked_in);

      let statusMatch = false;
      if (filterStatus === "all") statusMatch = true;
      else if (filterStatus === "checked_in") statusMatch = allCheckedIn && b.status !== "cancelled";
      else if (filterStatus === "not_checked_in") statusMatch = noneCheckedIn && b.status === "confirmed";
      else statusMatch = b.status === filterStatus;

      const q = searchName.trim().toLowerCase();
      const searchMatch =
        q === "" ||
        b.name.toLowerCase().includes(q) ||
        ((b as BookingWithTickets & { email?: string }).email ?? "").toLowerCase().includes(q) ||
        b.depositor_name.toLowerCase().includes(q);
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
      if (sortBy === "email") {
        const ae = (a as BookingWithTickets & { email?: string }).email ?? "";
        const be = (b as BookingWithTickets & { email?: string }).email ?? "";
        return ae.localeCompare(be);
      }
      // created (최신순) — 기본
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

  const totalTickets = filtered.reduce(
    (sum, b) => sum + (b.quantity ?? 1),
    0
  );

  function handleStatusChange(
    bookingId: string,
    status: "pending" | "confirmed" | "cancelled"
  ) {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("상태가 변경되었습니다.");
      setSelectedBooking(null);
      router.refresh();
    });
  }

  function handleForceCheckIn(bookingId: string, ticketId?: string) {
    startTransition(async () => {
      const result = await forceCheckIn(bookingId, ticketId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("입장 처리되었습니다.");
      setSelectedBooking(null);
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const bookingId = deleteTarget.id;
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deleteBooking(bookingId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("예매가 삭제되었습니다.");
      router.refresh();
    });
  }

  function handleResetConfirm() {
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

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("다운로드할 명단이 없습니다.");
      return;
    }
    const date = format(new Date(), "yyyyMMdd", { locale: ko });
    const safeTitle = (eventTitle ?? "스테이지").replace(/[\\/:*?"<>|]/g, "_");
    const csv = buildBookingsCsv(filtered, customFields ?? [], { isFree, price });
    downloadCsv(`${safeTitle}_신청자명단_${date}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      {/* 필터 + 검색 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {getStatusFilters(isFree).map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filterStatus === f.value ? "default" : "outline"}
              onClick={() => setFilterStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          className="w-48 h-8 text-sm"
          placeholder="이름 / 이메일 검색"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length}건 / {totalTickets}매
        </span>
      </div>

      {/* 정렬 + 다운로드 */}
      <div className="flex items-center gap-1">
        {([
          { value: "created", label: "최신순" },
          { value: "name", label: "이름순" },
          { value: "email", label: "이메일순" },
        ] as const).map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={sortBy === s.value ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setSortBy(s.value)}
          >
            {s.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-7 text-xs"
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          명단 다운로드
        </Button>
      </div>

      {/* 목록 — 간략 카드 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {initialBookings.length === 0
            ? "아직 예매가 없습니다."
            : "조건에 맞는 예매가 없습니다."}
        </div>
      ) : (
        <div className="divide-y rounded-2xl border">
          {filtered.map((booking) => {
            const quantity = booking.quantity ?? 1;
            const tickets = (booking.booking_tickets ?? []).sort(
              (a, b) => a.ticket_number - b.ticket_number
            );
            const checkedInCount = tickets.filter((t) => t.checked_in).length;
            const email = (booking as BookingWithTickets & { email?: string }).email;

            return (
              <div
                key={booking.id}
                role="button"
                tabIndex={0}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedBooking(booking);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">
                    {booking.name}
                    {email && (
                      <span className="text-muted-foreground font-normal ml-1 text-xs">
                        ({email})
                      </span>
                    )}
                    {quantity > 1 && (
                      <span className="text-muted-foreground ml-1">
                        {quantity}매
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <BookingStatusBadge status={booking.status} isFree={isFree} />
                    {checkedInCount > 0 && (
                      <Badge
                        variant="outline"
                        className="border-green-300 text-green-700 text-[10px]"
                      >
                        {checkedInCount === quantity
                          ? "입장완료"
                          : `입장 ${checkedInCount}/${quantity}`}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {!isFree && <span>입금자: {booking.depositor_name}</span>}
                    {!isFree && <span>입금예상: {booking.deposited_at}</span>}
                    {!isFree && price > 0 && (
                      <span className="font-medium text-foreground">
                        입금액: {(price * quantity).toLocaleString()}원
                      </span>
                    )}
                    <span>예약: {formatCreatedAt(booking.created_at)}</span>
                  </div>
                </div>
                {!isFree && booking.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(booking.id, "confirmed");
                    }}
                  >
                    입금확인
                  </Button>
                )}
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 Dialog */}
      <BookingDetailDialog
        booking={selectedBooking}
        isFree={isFree}
        price={price}
        isPending={isPending}
        fieldLabelMap={fieldLabelMap}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleStatusChange}
        onForceCheckIn={handleForceCheckIn}
        onResetPassword={(bookingId) => {
          const name = selectedBooking?.name ?? "";
          setSelectedBooking(null);
          setResetPw("");
          setResetTarget({ id: bookingId, name });
        }}
        onDelete={(id, name) => {
          setSelectedBooking(null);
          setDeleteTarget({ id, name });
        }}
      />

      {/* 삭제 확인 Dialog */}
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
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>
            님의 예매를 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?
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
              onClick={handleDeleteConfirm}
              disabled={isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 Dialog (네이티브 prompt 대체) */}
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
                if (e.key === "Enter") handleResetConfirm();
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
            <Button onClick={handleResetConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── 상세 Dialog ─── */

function BookingDetailDialog({
  booking,
  isFree,
  price,
  isPending,
  fieldLabelMap,
  onClose,
  onStatusChange,
  onForceCheckIn,
  onResetPassword,
  onDelete,
}: {
  booking: BookingWithTickets | null;
  isFree: boolean;
  price: number;
  isPending: boolean;
  fieldLabelMap: Record<string, string>;
  onClose: () => void;
  onStatusChange: (id: string, status: "pending" | "confirmed" | "cancelled") => void;
  onForceCheckIn: (bookingId: string, ticketId?: string) => void;
  onResetPassword: (bookingId: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (!booking) return null;

  const quantity = booking.quantity ?? 1;
  const tickets = (booking.booking_tickets ?? []).sort(
    (a, b) => a.ticket_number - b.ticket_number
  );
  const checkedInCount = tickets.filter((t) => t.checked_in).length;
  const allCheckedIn = tickets.length > 0 && checkedInCount === quantity;

  const customAnswers =
    booking.custom_answers &&
    typeof booking.custom_answers === "object" &&
    !Array.isArray(booking.custom_answers)
      ? (booking.custom_answers as Record<string, unknown>)
      : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {booking.name}
            {quantity > 1 && (
              <span className="text-muted-foreground font-normal">
                ({quantity}매)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 상태 */}
          <div className="flex items-center gap-1.5">
            <BookingStatusBadge status={booking.status} isFree={isFree} />
            {checkedInCount > 0 && (
              <Badge
                variant="outline"
                className="border-green-300 text-green-700 text-[10px]"
              >
                {allCheckedIn ? "입장완료" : `입장 ${checkedInCount}/${quantity}`}
              </Badge>
            )}
          </div>

          <Separator />

          {/* 기본 정보 */}
          <div className="grid gap-2 text-sm">
            {(booking as BookingWithTickets & { email?: string | null }).email && (
              <DetailRow label="이메일" value={(booking as BookingWithTickets & { email?: string | null }).email!} />
            )}
            {!isFree && (
              <>
                <DetailRow label="입금자명" value={booking.depositor_name} />
                <DetailRow label="입금예상시간" value={booking.deposited_at} />
                {price > 0 && (
                  <DetailRow
                    label="입금 금액"
                    value={`${(price * quantity).toLocaleString()}원${quantity > 1 ? ` (${price.toLocaleString()}원 × ${quantity}매)` : ""}`}
                  />
                )}
              </>
            )}
            <DetailRow label="예약일시" value={formatCreatedAt(booking.created_at)} />
          </div>

          {/* 커스텀 답변 */}
          {customAnswers && Object.keys(customAnswers).length > 0 && (
            <>
              <Separator />
              <div className="grid gap-2 text-sm">
                {Object.entries(customAnswers).map(([key, val]) => (
                  <DetailRow
                    key={key}
                    label={fieldLabelMap[key] || key}
                    value={String(val)}
                  />
                ))}
              </div>
            </>
          )}

          {/* 티켓별 입장 현황 */}
          {tickets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  입장 현황
                </p>
                <div className="space-y-1.5">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {quantity > 1 && (
                          <span className="text-muted-foreground">
                            #{t.ticket_number}
                          </span>
                        )}
                        {t.checked_in ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <Check className="size-3.5" /> 입장완료
                          </span>
                        ) : (
                          <span className="text-muted-foreground">미입장</span>
                        )}
                      </div>
                      {!t.checked_in && booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={isPending}
                          onClick={() => onForceCheckIn(booking.id, t.id)}
                        >
                          <LogIn className="size-3" />
                          입장처리
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 전체 입장 처리 (2매 이상 + 미입장 있을 때) */}
                {quantity > 1 && !allCheckedIn && booking.status === "confirmed" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full gap-1.5"
                    disabled={isPending}
                    onClick={() => onForceCheckIn(booking.id)}
                  >
                    <LogIn className="size-4" />
                    전체 입장 처리
                  </Button>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-2">
            {!isFree && booking.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onStatusChange(booking.id, "confirmed")}
              >
                입금확인
              </Button>
            )}
            {!isFree && booking.status === "confirmed" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onStatusChange(booking.id, "pending")}
              >
                입금확인 취소
              </Button>
            )}
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onStatusChange(booking.id, "cancelled")}
              >
                예매 취소
              </Button>
            )}
            {!booking.user_id && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                className="gap-1"
                onClick={() => onResetPassword(booking.id)}
              >
                <KeyRound className="size-3.5" />
                비밀번호 초기화
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              className="gap-1"
              onClick={() => onDelete(booking.id, booking.name)}
            >
              <Trash2 className="size-3.5" />
              삭제
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
