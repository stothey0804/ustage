import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EventStatusBadge,
} from "ustage";

/** CardHeader lays out title + description, and shifts to a 2-column grid
 *  as soon as a CardAction is present. */
export function TitleAndDescription() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>2026년 2월 14일 (토) 19:30 · 합정 살롱드유</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>봄맞이 어쿠스틱 라이브</CardTitle>
        <CardDescription>예매 마감까지 3일 남음</CardDescription>
        <CardAction>
          <EventStatusBadge status="open" />
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}

export function WithBorder() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader className="border-b">
        <CardTitle>예매 명단</CardTitle>
        <CardDescription>총 22건 · 입금완료 18건</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}
