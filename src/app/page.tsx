import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <section className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            소규모 공연을 위한 간단한 예매 · 입장 시스템
          </h1>
          <p className="text-base text-muted-foreground">
            공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요.
            QR로 입장까지 한 번에 처리됩니다.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/login">공연자 로그인</Link>
        </Button>

        <p className="text-xs text-muted-foreground">
          참석자는 공연자가 공유한 예매 링크로 접속해 주세요.
        </p>
      </section>
    </main>
  );
}
