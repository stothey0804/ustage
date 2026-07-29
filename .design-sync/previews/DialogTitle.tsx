import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** DialogTitle is required by radix for the dialog's accessible name — every
 *  DialogContent should contain exactly one. */
export function Default() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>스테이지를 삭제할까요?</DialogTitle>
          <DialogDescription>되돌릴 수 없습니다.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export function LongTitle() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            이미 예매한 내역이 있습니다. 추가 예약을 하시겠어요?
          </DialogTitle>
          <DialogDescription>
            추가 예약은 별도 예약 건으로 만들어집니다.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
