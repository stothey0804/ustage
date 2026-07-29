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

/** Actions stack on mobile and right-align from `sm` up. Put the confirming
 *  action last so it lands on the right. */
export function CancelAndConfirm() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>예약을 취소할까요?</DialogTitle>
          <DialogDescription>취소하면 좌석이 다시 열립니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">돌아가기</Button>
          </DialogClose>
          <Button variant="destructive">예약 취소</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `showCloseButton` appends a built-in Close action after your children. */
export function BuiltInCloseAction() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>예매가 접수되었습니다</DialogTitle>
          <DialogDescription>입금이 확인되면 확정 메일을 보내드려요.</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
