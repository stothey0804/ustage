import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ustage";

/** The muted sub-line under a CardTitle. Its presence switches CardHeader to a
 *  two-row grid, so title and description stay aligned. */
export function UnderTitle() {
  return (
    <Card className="w-[340px] max-w-full">
      <CardHeader>
        <CardTitle>예매 명단</CardTitle>
        <CardDescription>총 22건 · 입금완료 18건 · 입금대기 4건</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}

export function Multiline() {
  return (
    <Card className="w-[340px] max-w-full">
      <CardHeader>
        <CardTitle>입금 안내</CardTitle>
        <CardDescription>
          예매 후 24시간 이내에 입금해주셔야 예약이 확정됩니다. 입금이 확인되면 입장용
          QR 티켓이 담긴 확정 메일을 보내드려요.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}
