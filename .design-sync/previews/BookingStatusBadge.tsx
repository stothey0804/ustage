import { BookingStatusBadge } from "ustage";

/** Paid events: pending → confirmed → cancelled. */
export function PaidStates() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BookingStatusBadge status="pending" />
      <BookingStatusBadge status="confirmed" />
      <BookingStatusBadge status="cancelled" />
    </div>
  );
}

/** `isFree` relabels confirmed from 입금완료 to 참가확정 — free events have
 *  no deposit step, so the money wording would be wrong. */
export function FreeEvent() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BookingStatusBadge status="confirmed" isFree />
      <BookingStatusBadge status="cancelled" isFree />
    </div>
  );
}

export function InAttendeeList() {
  return (
    <div className="flex w-[320px] max-w-full flex-col gap-2 text-sm">
      {[
        { name: "김서영", status: "confirmed" },
        { name: "박도현", status: "pending" },
        { name: "이하늘", status: "cancelled" },
      ].map((b) => (
        <div key={b.name} className="flex items-center justify-between">
          <span>{b.name}</span>
          <BookingStatusBadge status={b.status} />
        </div>
      ))}
    </div>
  );
}
