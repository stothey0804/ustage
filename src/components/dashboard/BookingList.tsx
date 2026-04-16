"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { updateBookingStatus, deleteBooking } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingListProps {
  eventId: string;
  initialBookings: Array<Tables<"bookings">>;
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "입금대기" },
  { value: "confirmed", label: "입금완료" },
  { value: "cancelled", label: "취소" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return <Badge variant="default">입금완료</Badge>;
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

export function BookingList({ eventId, initialBookings }: BookingListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchName, setSearchName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = initialBookings.filter((b) => {
    const statusMatch =
      filterStatus === "all" || b.status === filterStatus;
    const nameMatch =
      searchName.trim() === "" ||
      b.name.includes(searchName.trim()) ||
      b.depositor_name.includes(searchName.trim());
    return statusMatch && nameMatch;
  });

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
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const bookingId = deleteTarget;
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
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
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
          총 {filtered.length}명
        </span>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {initialBookings.length === 0
            ? "아직 예매가 없습니다."
            : "조건에 맞는 예매가 없습니다."}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((booking) => {
            const customAnswers =
              booking.custom_answers &&
              typeof booking.custom_answers === "object" &&
              !Array.isArray(booking.custom_answers)
                ? (booking.custom_answers as Record<string, unknown>)
                : null;
            const hasCustomAnswers =
              customAnswers && Object.keys(customAnswers).length > 0;

            return (
              <div key={booking.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  {/* 이름 + 상태 배지 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium text-sm">{booking.name}</span>
                    <StatusBadge status={booking.status} />
                    {booking.checked_in && (
                      <Badge variant="outline" className="border-green-300 text-green-700 text-[10px]">
                        입장완료
                      </Badge>
                    )}
                  </div>
                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {booking.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={() =>
                          handleStatusChange(booking.id, "confirmed")
                        }
                      >
                        입금확인
                      </Button>
                    )}
                    {booking.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={() =>
                          handleStatusChange(booking.id, "pending")
                        }
                      >
                        입금확인 취소
                      </Button>
                    )}
                    {(booking.status === "pending" ||
                      booking.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={isPending}
                        onClick={() =>
                          handleStatusChange(booking.id, "cancelled")
                        }
                      >
                        취소
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => setDeleteTarget(booking.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>입금자명: {booking.depositor_name}</span>
                  <span>입금시간: {booking.deposited_at}</span>
                  <span>예약일시: {formatCreatedAt(booking.created_at)}</span>
                </div>

                {/* 커스텀 답변 */}
                {hasCustomAnswers && (
                  <div className="text-xs text-muted-foreground space-y-0.5 pl-0">
                    {Object.entries(
                      customAnswers as Record<string, unknown>
                    ).map(([key, val]) => (
                      <div key={key}>
                        <span className="font-medium">{key}</span>:{" "}
                        {String(val)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
            이 예매를 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?
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
