"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BookingDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        예약 정보를 불러오는 중 오류가 발생했습니다.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
