import { Calendar } from "ustage";
import { ko } from "date-fns/locale";

const FEB = new Date(2026, 1, 1);

/** CalendarDayButton is the per-day cell Calendar renders through
 *  `components.DayButton`. It reads day-modifier context, so the only true
 *  render of it is inside a Calendar — these cards show it selected, in a
 *  range, and disabled. */
export function SelectedDay() {
  return <Calendar mode="single" locale={ko} defaultMonth={FEB} selected={new Date(2026, 1, 14)} />;
}

export function RangeDays() {
  return (
    <Calendar
      mode="range"
      locale={ko}
      defaultMonth={FEB}
      selected={{ from: new Date(2026, 1, 11), to: new Date(2026, 1, 15) }}
    />
  );
}

export function DisabledDays() {
  return (
    <Calendar
      mode="single"
      locale={ko}
      defaultMonth={FEB}
      selected={new Date(2026, 1, 24)}
      disabled={{ before: new Date(2026, 1, 18) }}
    />
  );
}
