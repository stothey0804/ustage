"use client";

import { Button } from "@/components/ui/button";

export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-destructive">
        이벤트 정보를 불러오지 못했습니다.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
