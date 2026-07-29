import { Input, Label } from "ustage";

/** The booking-form field pattern: Label + Input in a 1.5-gap stack. */
export function LabelledField() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label htmlFor="depositor">입금자명</Label>
      <Input id="depositor" placeholder="입금하실 분의 성함" defaultValue="김서영" />
    </div>
  );
}

export function Types() {
  return (
    <div className="grid w-[320px] max-w-full gap-3">
      <Input placeholder="이름" />
      <Input type="email" placeholder="이메일 주소" defaultValue="seoyoung@example.com" />
      <Input type="password" placeholder="조회용 비밀번호 (4자 이상)" defaultValue="1234" />
      <Input type="number" placeholder="매수" defaultValue={2} />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-[320px] max-w-full gap-3">
      <Input placeholder="기본 상태" />
      <Input aria-invalid placeholder="이미 예매한 이메일입니다" defaultValue="dup@example.com" />
      <Input disabled placeholder="예매가 마감되었습니다" />
    </div>
  );
}
