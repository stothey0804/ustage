"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteEvent } from "@/app/actions/event";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteEventButtonProps {
  eventId: string;
  /** 예매 이력(취소 포함)이 있으면 삭제 불가 안내만 표시 */
  hasBookings: boolean;
}

export function DeleteEventButton({
  eventId,
  hasBookings,
}: DeleteEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteEvent(eventId);
      if (res.error) {
        toast.error(res.error);
        setOpen(false);
        return;
      }
      toast.success("이벤트가 삭제되었습니다.");
      router.replace("/dashboard/events");
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4 mr-1.5" />
        삭제
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>이벤트 삭제</DialogTitle>
          </DialogHeader>
          {hasBookings ? (
            <p className="text-sm text-muted-foreground">
              예매 내역이 있는 이벤트는 삭제할 수 없습니다. 대신 상태를
              마감으로 변경해 주세요.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                이벤트와 예매 페이지가 함께 사라지며 되돌릴 수 없습니다. 정말
                삭제할까요?
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
