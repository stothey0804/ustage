import {
  BookingStatusBadge,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "ustage";

/** Only the panel whose value matches the active trigger is mounted. */
export function ActivePanel() {
  return (
    <Tabs defaultValue="confirmed" className="w-[380px] max-w-full">
      <TabsList>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="confirmed">입금완료</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="text-muted-foreground">
        전체 예매 22건
      </TabsContent>
      <TabsContent value="confirmed" className="grid gap-2">
        {["김서영", "박도현", "이하늘"].map((n) => (
          <div key={n} className="flex items-center justify-between text-sm">
            <span>{n}</span>
            <BookingStatusBadge status="confirmed" />
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

/** Panels take any content, including whole cards. */
export function RichPanel() {
  return (
    <Tabs defaultValue="notice" className="w-[380px] max-w-full">
      <TabsList variant="line">
        <TabsTrigger value="info">공연 정보</TabsTrigger>
        <TabsTrigger value="notice">예매 안내</TabsTrigger>
      </TabsList>
      <TabsContent value="notice" className="pt-2">
        <Card size="sm">
          <CardContent className="text-sm text-muted-foreground">
            계좌이체 후 입금 확인이 되면 QR 티켓이 발송됩니다.
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
