import { Tabs, TabsContent, TabsList, TabsTrigger } from "ustage";

/** TabsList is the track. `default` is a filled pill rail; `line` is
 *  transparent and lets the active trigger's underline show. */
export function DefaultTrack() {
  return (
    <Tabs defaultValue="all" className="w-[360px] max-w-full">
      <TabsList>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="confirmed">입금완료</TabsTrigger>
        <TabsTrigger value="pending">입금대기</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="text-muted-foreground">전체 22건</TabsContent>
    </Tabs>
  );
}

export function LineTrack() {
  return (
    <Tabs defaultValue="info" className="w-[360px] max-w-full">
      <TabsList variant="line">
        <TabsTrigger value="info">공연 정보</TabsTrigger>
        <TabsTrigger value="notice">예매 안내</TabsTrigger>
      </TabsList>
      <TabsContent value="info" className="pt-2 text-muted-foreground">
        합정 살롱드유 · 40석
      </TabsContent>
    </Tabs>
  );
}

/** In a vertical Tabs the list becomes a rounded column rail. */
export function VerticalTrack() {
  return (
    <Tabs defaultValue="events" orientation="vertical" className="w-[360px] max-w-full">
      <TabsList>
        <TabsTrigger value="events">내 스테이지</TabsTrigger>
        <TabsTrigger value="bookings">내 예약</TabsTrigger>
      </TabsList>
      <TabsContent value="events" className="text-muted-foreground">스테이지 3건</TabsContent>
    </Tabs>
  );
}
