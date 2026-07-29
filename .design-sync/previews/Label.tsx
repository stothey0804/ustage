import { Input, Label, Textarea } from "ustage";

/** Label is a radix Label — clicking it focuses the control it names. */
export function WithInput() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label htmlFor="name">이름</Label>
      <Input id="name" placeholder="예매자 성함" />
    </div>
  );
}

/** A required marker is composed in as a child, not a prop. */
export function RequiredMarker() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label htmlFor="email">
        이메일 <span className="text-destructive">*</span>
      </Label>
      <Input id="email" type="email" placeholder="예매 확인 메일을 받을 주소" />
    </div>
  );
}

export function FormStack() {
  return (
    <div className="grid w-[320px] max-w-full gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="d">입금자명</Label>
        <Input id="d" defaultValue="김서영" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="t">입금 예상 시간</Label>
        <Input id="t" placeholder="오늘 저녁 9시쯤" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m">남길 말</Label>
        <Textarea id="m" placeholder="선택 입력" />
      </div>
    </div>
  );
}
