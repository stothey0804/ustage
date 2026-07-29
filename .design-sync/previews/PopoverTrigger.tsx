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

/** `asChild` makes the trigger the element you pass — an icon button here. */
export function IconTrigger() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>입금 확인</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="입금 확인 안내">
            <Info />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>입금 확인</PopoverTitle>
            <PopoverDescription>공연자가 직접 확인 처리합니다.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ButtonTrigger() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">정원 수정</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>정원 수정</PopoverTitle>
          <PopoverDescription>현재 정원 40석</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
