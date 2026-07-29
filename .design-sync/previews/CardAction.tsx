import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EventStatusBadge,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** CardAction parks a control in the header's top-right. It only positions
 *  correctly inside CardHeader — the header switches to a 2-column grid when
 *  it sees one. */
export function StatusBadgeAction() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>2026년 2월 14일 (토) 19:30</CardDescription>
        <CardAction>
          <EventStatusBadge status="open" />
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}

export function IconButtonAction() {
  return (
    <Card className="w-[360px] max-w-full">
      <CardHeader>
        <CardTitle>봄맞이 어쿠스틱 라이브</CardTitle>
        <CardDescription>잔여 12석</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="더보기">
            <MoreHorizontal />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}
