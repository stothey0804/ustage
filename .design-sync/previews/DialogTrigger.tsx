import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ustage";

/** `asChild` is the ustage default — the trigger should be a real Button, not
 *  a button wrapping a button. */
export function AsButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">스테이지 삭제</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>스테이지를 삭제할까요?</DialogTitle>
          <DialogDescription>되돌릴 수 없습니다.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

/** Any element can be the trigger — here a text link inside a sentence. */
export function AsLink() {
  return (
    <p className="text-sm">
      예매 전{" "}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" className="h-auto p-0 align-baseline">
            취소·환불 규정
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>취소·환불 규정</DialogTitle>
            <DialogDescription>공연 3일 전까지 전액 환불됩니다.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>{" "}
      을 확인해주세요.
    </p>
  );
}
