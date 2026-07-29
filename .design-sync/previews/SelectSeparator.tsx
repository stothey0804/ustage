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

/** A hairline between option groups inside an open SelectContent. */
export function BetweenGroups() {
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
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
