import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ustage";

/** SelectValue renders the chosen option's text inside the trigger, or the
 *  `placeholder` when nothing is chosen (which also turns the trigger muted). */
export function PlaceholderVsSelected() {
  return (
    <div className="grid w-[260px] max-w-full gap-3">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="매수를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1매</SelectItem>
          <SelectItem value="2">2매</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="2">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="매수를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1매</SelectItem>
          <SelectItem value="2">2매</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Long values are clamped to one line inside the trigger. */
export function LongValueClamps() {
  return (
    <Select defaultValue="refund-3">
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="refund-3">공연 3일 전까지 전액 환불됩니다</SelectItem>
      </SelectContent>
    </Select>
  );
}
