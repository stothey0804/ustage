import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** DialogHeader is the title + description stack at the top of DialogContent. */
export function TitleAndDescription() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>입금을 확인할까요?</DialogTitle>
          <DialogDescription>
            확인 처리하면 김서영님께 입장용 QR 티켓이 담긴 확정 메일이 발송됩니다.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

/** Title only — no description row. */
export function TitleOnly() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>예매 링크 공유</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
