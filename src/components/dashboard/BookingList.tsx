"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Check, X, ChevronRight, LogIn } from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { updateBookingStatus, deleteBooking, forceCheckIn } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  eventId: string;
  initialBookings: BookingWithTickets[];
  isFree?: boolean;
  customFields?: CustomField[];
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

function StatusBadge({ status, isFree }: { status: string; isFree?: boolean }) {
  if (status === "confirmed") {
    return <Badge variant="default">{isFree ? "참가확정" : "입금완료"}</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="outline">취소</Badge>;
  }
  return <Badge variant="secondary">입금대기</Badge>;
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

export function BookingList({
  eventId,
  initialBookings,
  isFree = false,
  customFields,
}: BookingListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchName, setSearchName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithTickets | null>(null);

  const fieldLabelMap = buildFieldLabelMap(customFields);

  const filtered = initialBookings.filter((b) => {
    const tickets = b.booking_tickets ?? [];
    const allCheckedIn = tickets.length > 0 && tickets.every((t) => t.checked_in);
    const noneCheckedIn = tickets.length === 0 || tickets.every((t) => !t.checked_in);

    let statusMatch = false;
    if (filterStatus === "all") statusMatch = true;
    else if (filterStatus === "checked_in") statusMatch = allCheckedIn && b.status !== "cancelled";
    else if (filterStatus === "not_checked_in") statusMatch = noneCheckedIn && b.status === "confirmed";
    else statusMatch = b.status === filterStatus;

    const nameMatch =
      searchName.trim() === "" ||
      b.name.includes(searchName.trim()) ||
      b.depositor_name.includes(searchName.trim());
    return statusMatch && nameMatch;
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
          className="w-40 h-8 text-sm"
          placeholder="이름 검색"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length}건 / {totalTickets}매
        </span>
      </div>

      {/* 목록 — 간략 카드 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {initialBookings.length === 0
            ? "아직 예매가 없습니다."
            : "조건에 맞는 예매가 없습니다."}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((booking) => {
            const quantity = booking.quantity ?? 1;
            const tickets = (booking.booking_tickets ?? []).sort(
              (a, b) => a.ticket_number - b.ticket_number
            );
            const checkedInCount = tickets.filter((t) => t.checked_in).length;

            return (
              <button
                type="button"
                key={booking.id}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">
                    {booking.name}
                    {quantity > 1 && (
                      <span className="text-muted-foreground ml-1">
                        ({quantity}매)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <StatusBadge status={booking.status} isFree={isFree} />
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
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* 상세 Dialog */}
      <BookingDetailDialog
        booking={selectedBooking}
        isFree={isFree}
        isPending={isPending}
        fieldLabelMap={fieldLabelMap}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleStatusChange}
        onForceCheckIn={handleForceCheckIn}
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
    </div>
  );
}

/* ─── 상세 Dialog ─── */

function BookingDetailDialog({
  booking,
  isFree,
  isPending,
  fieldLabelMap,
  onClose,
  onStatusChange,
  onForceCheckIn,
  onDelete,
}: {
  booking: BookingWithTickets | null;
  isFree: boolean;
  isPending: boolean;
  fieldLabelMap: Record<string, string>;
  onClose: () => void;
  onStatusChange: (id: string, status: "pending" | "confirmed" | "cancelled") => void;
  onForceCheckIn: (bookingId: string, ticketId?: string) => void;
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
            <StatusBadge status={booking.status} isFree={isFree} />
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
                <DetailRow label="입금시간" value={booking.deposited_at} />
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
