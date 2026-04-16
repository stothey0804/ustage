export default function EventPageLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
