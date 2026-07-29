import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";

/** PopoverAnchor detaches positioning from the trigger: the panel is placed
 *  against the anchor element while a different element opens it. */
export function AnchoredToRow() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverAnchor asChild>
        <div className="flex w-[300px] max-w-full items-center justify-between rounded-2xl bg-muted px-3 py-2 text-sm">
          <span>잔여 좌석 18 / 40석</span>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs">
              수정
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} align="start">
        <PopoverHeader>
          <PopoverTitle>정원 수정</PopoverTitle>
          <PopoverDescription>
            팝오버는 버튼이 아니라 이 행 전체를 기준으로 정렬됩니다.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
