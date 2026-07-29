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

/** SelectGroup ties a SelectLabel to the items under it for screen readers.
 *  It renders nothing visible on its own — only inside an open SelectContent. */
export function TwoGroups() {
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
          <SelectItem value="woori">우리은행</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
