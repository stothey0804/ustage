import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";

/** The muted paragraph under PopoverTitle — this is where the explanation
 *  goes, in full sentences. */
export function Default() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">안내</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>입금자명이 다르면?</PopoverTitle>
          <PopoverDescription>
            예매자 이름과 입금자명이 달라도 괜찮습니다. 공연자가 입금자명으로 대조하니
            실제 이체하실 이름을 적어주세요.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function ShortDescription() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">좌석</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>잔여 18석</PopoverTitle>
          <PopoverDescription>정원 40석 중 22석이 예매되었습니다.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
