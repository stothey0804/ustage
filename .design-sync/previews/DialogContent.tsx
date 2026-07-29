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

/** DialogContent renders its own DialogPortal + DialogOverlay, so you never
 *  mount those by hand. It ships a close button in the corner by default. */
export function Default() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>추가 예약을 하시겠어요?</DialogTitle>
          <DialogDescription>
            이미 예매한 내역이 있습니다. 계속하면 별도 예약 건으로 하나 더 만들어집니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">그만두기</Button>
          </DialogClose>
          <Button>추가 예약하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `showCloseButton={false}` for flows the user must resolve with a footer
 *  action rather than dismissing. */
export function WithoutCloseButton() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>취소·환불 규정에 동의해주세요</DialogTitle>
          <DialogDescription>
            공연 3일 전까지 전액 환불, 이후에는 환불이 불가합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full">확인했습니다</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
