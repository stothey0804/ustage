import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "ustage";

// Every open card passes position="popper". The DS default is item-aligned,
// which slides the list over the trigger and clips it off the top of a fixed
// card; popper drops the list below so the whole open state is visible.

/** Closed trigger — how a Select sits in a form most of the time. */
export function InForm() {
  return (
    <div className="grid w-[280px] max-w-full gap-1.5">
      <Label htmlFor="qty">예매 매수</Label>
      <Select defaultValue="2">
        <SelectTrigger id="qty" className="w-full">
          <SelectValue placeholder="매수를 선택하세요" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {["1", "2", "3", "4"].map((n) => (
            <SelectItem key={n} value={n}>
              {n}매
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Open, with grouped options — the state the design agent needs to see. */
export function OpenMenu() {
  return (
    <Select defaultValue="open" open modal={false}>
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectGroup>
          <SelectLabel>판매 중</SelectLabel>
          <SelectItem value="draft">오픈 전</SelectItem>
          <SelectItem value="open">티켓 오픈</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>종료</SelectLabel>
          <SelectItem value="closed">예매 마감</SelectItem>
          <SelectItem value="ended">스테이지 종료</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function TriggerStates() {
  return (
    <div className="grid w-[260px] max-w-full gap-3">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          <SelectItem value="a">항목</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="a">
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          <SelectItem value="a">작은 트리거</SelectItem>
        </SelectContent>
      </Select>
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="예매 마감" />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          <SelectItem value="a">항목</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
