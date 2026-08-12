"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function VerifiedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-destructive">
        인증 상태를 확인하지 못했습니다. 인증 자체는 완료되었을 수 있으니 로그인을
        먼저 시도해 주세요.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <p className="max-w-md break-words px-6 text-center font-mono text-xs text-muted-foreground">
          {error.message}
          {error.digest ? ` (digest: ${error.digest})` : ""}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          다시 시도
        </Button>
        <Button asChild size="sm">
          <Link href="/">로그인하기</Link>
        </Button>
      </div>
    </div>
  );
}
