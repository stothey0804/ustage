import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ustage";

/** DialogOverlay is the dimming layer. DialogContent already renders one, so
 *  the only honest preview is a dialog that is open — the overlay is the
 *  scrim you see behind the panel. */
export function BehindContent() {
  return (
    <div className="relative">
      <div className="grid gap-2 text-sm text-muted-foreground">
        <p>겨울밤의 소극장 콘서트</p>
        <p>2026년 2월 14일 (토) 19:30 · 합정 살롱드유</p>
        <p>이 배경 위로 오버레이가 덮입니다.</p>
      </div>
      <Dialog defaultOpen modal={false}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>예매 안내</DialogTitle>
            <DialogDescription>
              뒤쪽 콘텐츠는 DialogOverlay 로 어둡게 덮입니다.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
