import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

// 검색엔진·AI 검색(GEO)용 구조화 데이터
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "어스테이지",
      alternateName: "UStage",
      description:
        "소규모 공연·강연을 위한 링크 공유형 예매 서비스. 계좌이체 입금 확인과 QR 입장까지 한 번에.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "SoftwareApplication",
      name: "어스테이지",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "공연자가 예매 링크를 직접 공유하는 폐쇄형 예매·입장확인 시스템. 참석자는 링크로만 예매하고, 공연자가 계좌이체 입금을 확인하면 QR 티켓이 발급됩니다. 비회원도 이메일과 비밀번호로 예매·조회할 수 있습니다.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      featureList: [
        "링크 공유형 비공개 예매",
        "계좌이체 입금 수동 확인",
        "QR 코드 입장 확인",
        "비회원 예매 및 조회",
        "예매 명단 관리",
      ],
      inLanguage: "ko-KR",
    },
  ],
};

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <section className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-primary">
            어스테이지(US.tage)
          </h1>
          <p className="text-base text-muted-foreground">
            소규모 공연·이벤트를 위한 예매 서비스 <br />
            어스테이지입니다.
          </p>
          <p className="text-base text-muted-foreground">
            공연자가 링크를 공유하면, <br />
            참석자는 그 링크로만 예매할 수 있어요.
          </p>
          <p className="text-base text-muted-foreground">
            티켓 예매부터 QR 입장까지 제공해드려요.
          </p>
        </div>

        <Link
          href="/guide"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <Sparkles className="size-4" />
          어스테이지 사용방법
        </Link>

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
