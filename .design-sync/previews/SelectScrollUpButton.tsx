import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ustage";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

/** SelectContent renders SelectScrollUpButton itself. It only becomes visible
 *  when the list overflows and is scrolled down — this card is the long list
 *  that produces it, opened on a late value. */
export function LongList() {
  return (
    <Select defaultValue="21" open modal={false}>
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
