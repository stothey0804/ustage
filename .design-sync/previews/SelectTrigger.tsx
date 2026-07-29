import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ustage";

/** The trigger owns the control's size and validity state. It renders its own
 *  chevron — don't add one. */
export function Sizes() {
  return (
    <div className="grid w-[260px] max-w-full gap-3">
      <Select defaultValue="2">
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2매</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="2">
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2매</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-[260px] max-w-full gap-3">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="매수를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1매</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger aria-invalid className="w-full">
          <SelectValue placeholder="필수 항목입니다" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1매</SelectItem>
        </SelectContent>
      </Select>
      <Select disabled defaultValue="1">
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1매</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
