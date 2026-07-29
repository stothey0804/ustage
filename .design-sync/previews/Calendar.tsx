import { Calendar } from "ustage";
import { ko } from "date-fns/locale";

// Fixed dates so the card is deterministic across captures.
const FEB = new Date(2026, 1, 1);
const SHOW_DAY = new Date(2026, 1, 14);

export function SingleDate() {
  return <Calendar mode="single" locale={ko} defaultMonth={FEB} selected={SHOW_DAY} />;
}

/** Range selection — the ustage dashboard uses it for booking windows. */
export function DateRange() {
  return (
    <Calendar
      mode="range"
      locale={ko}
      defaultMonth={FEB}
      selected={{ from: new Date(2026, 1, 9), to: new Date(2026, 1, 13) }}
    />
  );
}

/** Past days disabled, the way a booking-start picker behaves. */
export function WithDisabledDays() {
  return (
    <Calendar
      mode="single"
      locale={ko}
      defaultMonth={FEB}
      selected={new Date(2026, 1, 20)}
      disabled={{ before: new Date(2026, 1, 10) }}
    />
  );
}
