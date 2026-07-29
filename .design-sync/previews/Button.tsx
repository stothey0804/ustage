import { Button } from "ustage";
import { CalendarPlus, Check, ScanLine, Trash2 } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>예매하기</Button>
      <Button variant="secondary">임시저장</Button>
      <Button variant="outline">수정</Button>
      <Button variant="ghost">닫기</Button>
      <Button variant="destructive">스테이지 삭제</Button>
      <Button variant="link">비회원 예약정보 조회</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">xs</Button>
      <Button size="sm">sm</Button>
      <Button size="default">default</Button>
      <Button size="lg">참가 신청하기</Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <ScanLine />
        입장 확인
      </Button>
      <Button variant="outline">
        <CalendarPlus />
        캘린더에 추가
      </Button>
      <Button variant="secondary">
        입금 확인
        <Check />
      </Button>
      <Button variant="destructive" size="icon" aria-label="삭제">
        <Trash2 />
      </Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled>예매 마감</Button>
      <Button variant="outline" disabled>
        수정 불가
      </Button>
      <Button variant="secondary" disabled>
        정원 마감
      </Button>
    </div>
  );
}
