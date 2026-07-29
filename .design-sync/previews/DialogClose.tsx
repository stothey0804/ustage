import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** DialogClose dismisses the dialog from anywhere inside DialogContent.
 *  Use `asChild` so it becomes the Button rather than wrapping one. */
export function InFooter() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>예매 링크를 복사했습니다</DialogTitle>
          <DialogDescription>참석자에게 링크를 공유해주세요.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">닫기</Button>
          </DialogClose>
          <Button>다시 복사</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A single full-width acknowledgement is a common ustage confirmation shape. */
export function SingleAcknowledge() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>입금 확인이 완료되었습니다</DialogTitle>
          <DialogDescription>확정 메일과 QR 티켓이 발송되었습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">확인</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
