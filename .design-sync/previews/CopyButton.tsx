import { Card, CardContent, CardHeader, CardTitle, CopyButton, Separator } from "ustage";

/** CopyButton writes `value` to the clipboard and flips to a 복사됨 check for
 *  2 seconds. `label` is the idle wording. */
export function Default() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CopyButton value="https://privateustage.com/e/winter-salon" />
      <CopyButton value="카카오뱅크 3333-01-2345678" label="계좌 복사" />
      <CopyButton value="BK-2026-0214-018" label="예약번호 복사" />
    </div>
  );
}

/** Where it actually sits in ustage: next to the value it copies. */
export function BesideValue() {
  return (
    <Card className="w-[380px] max-w-full">
      <CardHeader>
        <CardTitle>입금 계좌</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">카카오뱅크 3333-01-2345678 (김서영)</span>
          <CopyButton value="카카오뱅크 3333-01-2345678" />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-muted-foreground">
            privateustage.com/e/winter-salon
          </span>
          <CopyButton value="https://privateustage.com/e/winter-salon" label="링크 복사" />
        </div>
      </CardContent>
    </Card>
  );
}
