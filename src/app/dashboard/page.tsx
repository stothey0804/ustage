import Link from "next/link";
import { Calendar, Ticket } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/events">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="size-5 text-primary" />
              </div>
              <CardTitle>내 이벤트 관리</CardTitle>
              <CardDescription>
                이벤트를 만들고 예매 현황을 관리하세요.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/bookings">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Ticket className="size-5 text-primary" />
              </div>
              <CardTitle>내 예약 조회</CardTitle>
              <CardDescription>
                예매한 이벤트를 확인하고 QR 코드를 받으세요.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
