export default function BookingDetailLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-6 w-64 rounded bg-muted" />
      </div>
      <div className="h-16 rounded-lg border bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-4 w-4 rounded bg-muted shrink-0 mt-0.5" />
            <div className="h-4 w-20 rounded bg-muted shrink-0" />
            <div className="h-4 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
