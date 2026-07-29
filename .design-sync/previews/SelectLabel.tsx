import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "ustage";

/** The small muted heading over a SelectGroup's items. Not a form label —
 *  use `Label` for that. */
export function GroupHeadings() {
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
