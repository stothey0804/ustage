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

/** SelectContent portals the listbox out to the body and renders its own
 *  scroll buttons and viewport — only SelectItem/Group/Label/Separator go in. */
export function OpenList() {
  return (
    <Select defaultValue="open" open modal={false}>
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="draft">오픈 전</SelectItem>
        <SelectItem value="open">티켓 오픈</SelectItem>
        <SelectItem value="closed">예매 마감</SelectItem>
        <SelectItem value="ended">스테이지 종료</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Grouped() {
  return (
    <Select defaultValue="kakao" open modal={false}>
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectGroup>
          <SelectLabel>인터넷은행</SelectLabel>
          <SelectItem value="kakao">카카오뱅크</SelectItem>
          <SelectItem value="toss">토스뱅크</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>시중은행</SelectLabel>
          <SelectItem value="kb">국민은행</SelectItem>
          <SelectItem value="shinhan">신한은행</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
