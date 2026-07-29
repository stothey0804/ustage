import { EventStatusBadge } from "ustage";

/** Every event lifecycle state. The badge maps the raw `status` column
 *  straight to its Korean label and tone — callers never pass a label. */
export function AllStates() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <EventStatusBadge status="draft" />
      <EventStatusBadge status="open" />
      <EventStatusBadge status="closed" />
      <EventStatusBadge status="ended" />
    </div>
  );
}

/** An unknown or null status falls back to `draft` rather than rendering empty. */
export function NullFallback() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <EventStatusBadge status={null} />
    </div>
  );
}

export function InListRow() {
  return (
    <div className="flex w-[340px] max-w-full flex-col gap-2">
      {[
        { title: "겨울밤의 소극장 콘서트", status: "open" },
        { title: "봄맞이 어쿠스틱 라이브", status: "draft" },
        { title: "가을 낭독회", status: "ended" },
      ].map((e) => (
        <div key={e.title} className="flex items-center justify-between gap-3">
          <span className="truncate text-sm">{e.title}</span>
          <EventStatusBadge status={e.status} />
        </div>
      ))}
    </div>
  );
}
