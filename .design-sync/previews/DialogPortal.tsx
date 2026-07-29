import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** DialogPortal moves the dialog out to document.body so it escapes any
 *  overflow/transform ancestor. DialogContent already wraps itself in one —
 *  this card shows the effect: the panel escapes a clipped, scrolling box. */
export function EscapesClippedParent() {
  return (
    <div className="h-24 w-[320px] max-w-full overflow-hidden rounded-2xl bg-muted p-3 text-sm">
      <p className="text-muted-foreground">
        overflow-hidden 컨테이너 안에서도 다이얼로그는 body 로 포털되어 잘리지 않습니다.
      </p>
      <Dialog defaultOpen modal={false}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>포털로 렌더된 다이얼로그</DialogTitle>
            <DialogDescription>
              부모의 overflow 나 transform 에 영향받지 않습니다.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
