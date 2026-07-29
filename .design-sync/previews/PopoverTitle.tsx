import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";

/** The font-heading line at the top of a popover. Keep it to one short
 *  question or noun phrase. */
export function Default() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">안내</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>추가 구매</PopoverTitle>
          <PopoverDescription>
            같은 이메일로 예약을 하나 더 만들 수 있습니다.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function TitleOnly() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">좌석</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>잔여 18석</PopoverTitle>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
