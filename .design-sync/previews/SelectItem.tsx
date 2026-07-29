import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ustage";

/** The selected item shows a check on the right — that indicator is built in,
 *  so item children are just the label. */
export function SelectedAndDisabled() {
  return (
    <Select defaultValue="2" open modal={false}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="1">1매</SelectItem>
        <SelectItem value="2">2매</SelectItem>
        <SelectItem value="3">3매</SelectItem>
        <SelectItem value="4" disabled>
          4매 (잔여 부족)
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LongLabels() {
  return (
    <Select defaultValue="refund-3" open modal={false}>
      <SelectTrigger className="w-[260px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <SelectItem value="refund-7">공연 7일 전까지 전액 환불</SelectItem>
        <SelectItem value="refund-3">공연 3일 전까지 전액 환불</SelectItem>
        <SelectItem value="refund-0">환불 불가</SelectItem>
      </SelectContent>
    </Select>
  );
}
