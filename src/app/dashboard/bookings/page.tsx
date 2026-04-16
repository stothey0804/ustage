import { Ticket } from "lucide-react";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">내 예약</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <Ticket className="size-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          예약 목록 기능은 M5에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}
