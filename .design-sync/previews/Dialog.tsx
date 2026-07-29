import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ustage";

/** Confirmation dialog — the ustage pattern for irreversible owner actions.
 *  `defaultOpen` keeps the open state visible in a static card. */
export function ConfirmDialog() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogTrigger asChild>
        <Button variant="destructive">스테이지 삭제</Button>
      </DialogTrigger>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>스테이지를 삭제할까요?</DialogTitle>
          <DialogDescription>
            삭제하면 예매 명단과 발급된 QR 티켓이 모두 사라지며 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button variant="destructive">삭제하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Closed state — only the trigger is on the page until the user opens it. */
export function ClosedTrigger() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">예매 안내 보기</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예매 안내</DialogTitle>
          <DialogDescription>계좌이체 후 입금 확인이 되면 QR 티켓이 발송됩니다.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
