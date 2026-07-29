import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";
import { Info } from "lucide-react";

/** Open — the ustage inline-explainer pattern. */
export function OpenPopover() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="안내">
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>입금 확인은 어떻게 하나요?</PopoverTitle>
          <PopoverDescription>
            공연자가 계좌 입금을 직접 확인한 뒤 대시보드에서 참석확정으로 바꿉니다.
            확정되면 QR 티켓이 담긴 메일이 발송돼요.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

/** Closed — only the trigger is in the layout. */
export function ClosedTrigger() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">환불 규정 보기</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>취소·환불</PopoverTitle>
          <PopoverDescription>공연 3일 전까지 전액 환불됩니다.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
