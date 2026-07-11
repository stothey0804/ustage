import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

// 검색엔진·AI 검색(GEO)용 자주 묻는 질문 — 화면 표시와 FAQPage 구조화 데이터를 함께 사용
const FAQS: { q: string; a: string }[] = [
  {
    q: "어스테이지(us.tage)는 어떤 서비스인가요?",
    a: "어스테이지는 소규모 공연·강연을 위한 링크 공유형 예매 서비스입니다. 공연자가 예매 링크를 공유하면 참석자는 그 링크로만 예매하고, 계좌이체 입금이 확인되면 QR 코드로 입장합니다.",
  },
  {
    q: "결제는 어떻게 하나요?",
    a: "결제는 계좌이체 전용입니다. 참석자가 안내된 계좌로 입금하면 공연자가 직접 입금을 확인하고 예매를 확정합니다. 카드·PG 연동은 없습니다.",
  },
  {
    q: "회원가입 없이도 예매할 수 있나요?",
    a: "네. 비회원도 이메일과 비밀번호(4자 이상)만 입력하면 예매할 수 있고, 같은 이메일·비밀번호로 예약 내역을 다시 조회할 수 있습니다.",
  },
  {
    q: "입장 확인은 어떻게 이뤄지나요?",
    a: "예매가 확정되면 매수만큼 QR 코드가 발급됩니다. 현장에서 공연자가 QR을 스캔하면 입장 처리되며, 재입장 시도는 자동으로 경고됩니다. QR에는 개인정보 없이 무작위 토큰만 담깁니다.",
  },
  {
    q: "무료 이벤트도 운영할 수 있나요?",
    a: "네. 무료 이벤트는 입금 절차 없이 예매 즉시 참가가 확정되고 QR이 바로 발급됩니다.",
  },
];

// 검색엔진·AI 검색(GEO)용 구조화 데이터
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "어스테이지",
      alternateName: ["us.tage", "UStage"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description:
        "소규모 공연·강연을 위한 링크 공유형 예매·QR 입장 서비스 어스테이지(us.tage).",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "어스테이지",
      alternateName: ["us.tage", "UStage"],
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "소규모 공연·강연을 위한 링크 공유형 예매 서비스. 계좌이체 입금 확인과 QR 입장까지 한 번에.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "SoftwareApplication",
      name: "어스테이지",
      alternateName: "us.tage",
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
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
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
          <h1>
            <Wordmark className="text-5xl sm:text-6xl" />
            <span className="sr-only">어스테이지</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground">어스테이지</p>
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

        <section
          aria-labelledby="faq-heading"
          className="mt-6 w-full border-t pt-8 text-left"
        >
          <h2
            id="faq-heading"
            className="mb-4 text-center text-lg font-semibold tracking-tight"
          >
            자주 묻는 질문
          </h2>
          <dl className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border bg-card p-5">
                <dt className="font-medium text-foreground">{q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
