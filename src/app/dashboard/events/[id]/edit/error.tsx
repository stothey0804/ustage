"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function EditEventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-destructive">
        스테이지 수정 화면을 열지 못했습니다.
      </p>
      {/* 개발 중에는 원인을 감추지 않는다 — 이 경계가 세그먼트의 모든 예외를 잡는다. */}
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
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/events">내 스테이지로</Link>
        </Button>
      </div>
    </div>
  );
}
