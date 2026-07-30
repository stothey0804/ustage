"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          카카오 연결 화면을 불러오지 못했습니다. 계정 설정에서 연결할 수 있어요.
        </p>
        <Button onClick={reset}>다시 시도</Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/account">계정 설정으로</Link>
        </Button>
      </div>
    </main>
  );
}
