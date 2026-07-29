import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** The muted body line under DialogTitle. Say what will happen, concretely. */
export function Default() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>비밀번호를 초기화할까요?</DialogTitle>
          <DialogDescription>
            새 임시 비밀번호가 화면에 표시됩니다. 참석자에게 직접 전달해주세요.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export function Multiline() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>스테이지를 삭제할까요?</DialogTitle>
          <DialogDescription>
            삭제하면 예매 명단 22건과 이미 발급된 QR 티켓 40장이 모두 사라집니다.
            참석자에게는 별도 안내가 나가지 않으니, 삭제 전에 공지를 먼저 보내주세요.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
