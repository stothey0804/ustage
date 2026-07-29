import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "ustage";

/** PopoverContent portals itself and is a `w-72` flex column with `gap-4` —
 *  children stack without extra spacing utilities. */
export function TextContent() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">안내</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>비회원 예약 조회</PopoverTitle>
          <PopoverDescription>
            예매할 때 입력한 이메일과 비밀번호로 언제든 예약을 확인할 수 있습니다.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

/** Popovers can hold controls — here a quick capacity edit. */
export function FormContent() {
  return (
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">정원 수정</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} align="start">
        <PopoverHeader>
          <PopoverTitle>정원 수정</PopoverTitle>
          <PopoverDescription>이미 예매된 좌석보다 적게 줄일 수 없습니다.</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="cap">정원</Label>
          <Input id="cap" type="number" defaultValue={40} />
        </div>
        <Button size="sm">저장</Button>
      </PopoverContent>
    </Popover>
  );
}
