import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ustage";

/** CardTitle is the font-heading / text-base slot inside CardHeader. */
export function Default() {
  return (
    <Card className="w-[340px] max-w-full">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>2026년 2월 14일 (토) 19:30</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}

/** Long titles wrap — the header grid gives the title the full first column. */
export function LongTitle() {
  return (
    <Card className="w-[340px] max-w-full">
      <CardHeader>
        <CardTitle>
          늦겨울 낭독의 밤 — 시와 산문 사이에서 읽는 열두 개의 문장
        </CardTitle>
        <CardDescription>합정 살롱드유 · 40석</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">본문 영역</CardContent>
    </Card>
  );
}
