import { Card, CardContent, CardHeader, CardTitle, Separator } from "ustage";

export function Horizontal() {
  return (
    <Card className="w-[320px] max-w-full">
      <CardHeader>
        <CardTitle>예약 요약</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">티켓</span>
          <span>2매</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">결제 금액</span>
          <span className="font-medium">50,000원</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Vertical separators need a flex parent with a definite cross-size —
 *  the rule stretches to the row via `self-stretch`. */
export function Vertical() {
  return (
    <div className="flex h-6 items-center gap-3 text-sm">
      <span>티켓 오픈</span>
      <Separator orientation="vertical" />
      <span>25,000원</span>
      <Separator orientation="vertical" />
      <span>잔여 18석</span>
    </div>
  );
}
