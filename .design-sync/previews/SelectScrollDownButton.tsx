import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ustage";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

/** The counterpart to SelectScrollUpButton, rendered by SelectContent at the
 *  bottom edge when more options remain below the viewport. */
export function LongList() {
  return (
    <Select defaultValue="02" open modal={false}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="max-h-56">
        {HOURS.map((h) => (
          <SelectItem key={h} value={h}>
            {h}시
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
