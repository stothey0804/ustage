import { Tabs, TabsContent, TabsList, TabsTrigger } from "ustage";
import { Ticket, Users } from "lucide-react";

/** Active vs. inactive vs. disabled, in one track. */
export function States() {
  return (
    <Tabs defaultValue="confirmed" className="w-[380px] max-w-full">
      <TabsList>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="confirmed">입금완료</TabsTrigger>
        <TabsTrigger value="cancelled" disabled>
          취소
        </TabsTrigger>
      </TabsList>
      <TabsContent value="confirmed" className="text-muted-foreground">
        입금이 확인된 예매 18건
      </TabsContent>
    </Tabs>
  );
}

export function WithIcons() {
  return (
    <Tabs defaultValue="tickets" className="w-[380px] max-w-full">
      <TabsList>
        <TabsTrigger value="tickets">
          <Ticket />
          티켓
        </TabsTrigger>
        <TabsTrigger value="attendees">
          <Users />
          참석자
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tickets" className="text-muted-foreground">발급된 티켓 40장</TabsContent>
    </Tabs>
  );
}
