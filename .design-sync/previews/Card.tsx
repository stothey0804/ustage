import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EventStatusBadge,
  Separator,
} from "ustage";

export function EventCard() {
  return (
    <Card className="w-[380px] max-w-full">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>2026년 2월 14일 (토) 19:30 · 합정 살롱드유</CardDescription>
        <CardAction>
          <EventStatusBadge status="open" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">티켓 가격</span>
          <span className="font-medium">25,000원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">잔여 좌석</span>
          <span className="font-medium">18 / 40석</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">예매 마감</span>
          <span className="font-medium">2월 13일 23:59</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="flex-1">예매하기</Button>
        <Button variant="outline">공유</Button>
      </CardFooter>
    </Card>
  );
}

export function CompactCard() {
  return (
    <Card size="sm" className="w-[320px] max-w-full">
      <CardHeader>
        <CardTitle>내 예약</CardTitle>
        <CardDescription>예약번호 BK-2026-0214-018</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">예매자</span>
          <span>김서영</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">매수</span>
          <span>2매</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ContentOnly() {
  return (
    <Card className="w-[320px] max-w-full">
      <CardContent className="text-muted-foreground">
        아직 등록한 스테이지가 없습니다. 첫 스테이지를 만들어 예매 링크를 공유해보세요.
      </CardContent>
    </Card>
  );
}
