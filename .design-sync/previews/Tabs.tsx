import { Tabs, TabsContent, TabsList, TabsTrigger } from "ustage";

/** The dashboard pattern: filter the attendee list by booking status. */
export function BookingFilters() {
  return (
    <Tabs defaultValue="all" className="w-[380px] max-w-full">
      <TabsList>
        <TabsTrigger value="all">전체 22</TabsTrigger>
        <TabsTrigger value="confirmed">입금완료 18</TabsTrigger>
        <TabsTrigger value="pending">입금대기 4</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="text-muted-foreground">
        예매 22건이 모두 표시됩니다.
      </TabsContent>
      <TabsContent value="confirmed">입금이 확인된 예매 18건</TabsContent>
      <TabsContent value="pending">입금을 기다리는 예매 4건</TabsContent>
    </Tabs>
  );
}

/** `variant="line"` drops the pill track for an underline treatment. */
export function LineVariant() {
  return (
    <Tabs defaultValue="info" className="w-[380px] max-w-full">
      <TabsList variant="line">
        <TabsTrigger value="info">공연 정보</TabsTrigger>
        <TabsTrigger value="notice">예매 안내</TabsTrigger>
        <TabsTrigger value="refund">취소·환불</TabsTrigger>
      </TabsList>
      <TabsContent value="info" className="pt-2 text-muted-foreground">
        2026년 2월 14일 (토) 19:30 · 합정 살롱드유
      </TabsContent>
    </Tabs>
  );
}

export function Vertical() {
  return (
    <Tabs defaultValue="events" orientation="vertical" className="w-[380px] max-w-full">
      <TabsList variant="default">
        <TabsTrigger value="events">내 스테이지</TabsTrigger>
        <TabsTrigger value="bookings">내 예약</TabsTrigger>
        <TabsTrigger value="account">계정 설정</TabsTrigger>
      </TabsList>
      <TabsContent value="events" className="text-muted-foreground">
        등록한 스테이지 3건
      </TabsContent>
    </Tabs>
  );
}
