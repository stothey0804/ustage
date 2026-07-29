import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "ustage";

/** CardContent supplies the card's horizontal padding — it does not add its own
 *  vertical rhythm, so lay the body out with a grid/flex gap. */
export function DetailRows() {
  return (
    <Card className="w-[340px] max-w-full">
      <CardHeader>
        <CardTitle>예약 상세</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">예매자</span>
          <span>김서영</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">매수</span>
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

/** Card size="sm" tightens CardContent's padding through a group selector. */
export function CompactPadding() {
  return (
    <Card size="sm" className="w-[300px] max-w-full">
      <CardContent className="text-sm">
        입금이 확인되면 등록하신 이메일로 QR 티켓을 보내드립니다.
      </CardContent>
    </Card>
  );
}
