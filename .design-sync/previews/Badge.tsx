import { Badge } from "ustage";
import { Check, Clock, Ticket } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>티켓 오픈</Badge>
      <Badge variant="secondary">오픈 전</Badge>
      <Badge variant="outline">예매 마감</Badge>
      <Badge variant="destructive">취소</Badge>
      <Badge variant="ghost">임시저장</Badge>
      <Badge variant="link">자세히</Badge>
    </div>
  );
}

export function WithIcon() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>
        <Check />
        입금완료
      </Badge>
      <Badge variant="secondary">
        <Clock />
        입금대기
      </Badge>
      <Badge variant="outline">
        <Ticket />
        2매
      </Badge>
    </div>
  );
}

export function Counts() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">18 / 40석</Badge>
      <Badge>잔여 22석</Badge>
      <Badge variant="outline">무료</Badge>
    </div>
  );
}
