import { Label, DateTimePicker } from "ustage";

const noop = () => {};

/** The closed control — a full-width outline Button showing the formatted
 *  Korean date. `value` is a local `YYYY-MM-DDTHH:mm` string, not a Date. */
export function Filled() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label>공연 일시</Label>
      <DateTimePicker value="2026-02-14T19:30" onChange={noop} />
    </div>
  );
}

export function Empty() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label>예매 마감</Label>
      <DateTimePicker onChange={noop} placeholder="날짜와 시간을 선택하세요" />
    </div>
  );
}

export function Disabled() {
  return (
    <div className="grid w-[320px] max-w-full gap-1.5">
      <Label>공연 일시</Label>
      <DateTimePicker value="2026-02-14T19:30" onChange={noop} disabled />
    </div>
  );
}
