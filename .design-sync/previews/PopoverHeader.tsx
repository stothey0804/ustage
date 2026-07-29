import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";

/** PopoverHeader is the title + description stack at the top of a popover. */
export function TitleAndDescription() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">안내</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>QR 티켓은 언제 받나요?</PopoverTitle>
          <PopoverDescription>
            입금이 확인되면 등록하신 이메일로 티켓 매수만큼 QR이 발송됩니다.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function WithFooterAction() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">예매 마감</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>지금 예매를 마감할까요?</PopoverTitle>
          <PopoverDescription>마감해도 나중에 다시 열 수 있습니다.</PopoverDescription>
        </PopoverHeader>
        <Button size="sm">마감하기</Button>
      </PopoverContent>
    </Popover>
  );
}
