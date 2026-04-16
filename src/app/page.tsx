import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <section className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-primary">
            어스테이지(US.tage)
          </h1>
          <p className="text-base text-muted-foreground">
            소규모 공연·이벤트를 위한 예매 서비스 어스테이지입니다.
            <br />
            공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요.
            <br />
            티켓 예매부터 QR 입장까지 제공해드려요.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          예매 링크를 받으셨나요?{" "}
          <span className="font-medium text-foreground">
            링크를 직접 열어 예매하세요.
          </span>
        </p>
      </section>
    </main>
  );
}
