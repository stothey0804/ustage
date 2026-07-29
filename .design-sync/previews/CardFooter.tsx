import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ustage";

/** The action row at the bottom of a card. It is a flex row — spacing comes
 *  from the utilities you add. */
export function ActionRow() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>잔여 18석 · 25,000원</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button className="flex-1">예매하기</Button>
        <Button variant="outline">공유</Button>
      </CardFooter>
    </Card>
  );
}

/** With `.border-t` the footer picks up its own top padding. */
export function WithTopBorder() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>예약 취소</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        공연 3일 전까지 취소하면 전액 환불됩니다.
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="ghost">닫기</Button>
        <Button variant="destructive">예약 취소</Button>
      </CardFooter>
    </Card>
  );
}
