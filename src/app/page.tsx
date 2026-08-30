import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";
import { LoginForm } from "@/components/auth/LoginForm";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

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
  ],
};

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

/**
 * 메인 = 로그인. 별도 랜딩을 두지 않고 첫 화면에서 바로 로그인한다
 * (핸드오프 Z1). `/login`은 이 경로로 리다이렉트만 한다.
 * 화면에는 로그인만 두고, 검색 노출용 구조화 데이터(Organization·WebSite·
 * SoftwareApplication)는 유지한다.
 */
export default async function Home({ searchParams }: Props) {
  const { next, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(safeInternalPath(next));

  return (
    <main className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* 상단 브랜드 — 시안에는 없지만 첫 화면임을 알리는 마크 + 워드마크 */}
      <header className="mx-auto flex w-full max-w-sm items-center gap-2 px-6 pt-6">
        <BrandMark className="size-8" />
        <Wordmark className="text-xl" />
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-snug tracking-tight">
            작은 공연의 예매를
            <br />
            링크 하나로
          </h1>
          <p className="text-13 leading-relaxed text-muted-foreground">
            예매한 티켓과 내가 여는 스테이지를 한 계정에서 관리합니다.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <LoginForm next={safeInternalPath(next)} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">또는</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <KakaoLoginButton
            next={safeInternalPath(next)}
            label="카카오로 계속하기"
          />
        </div>

        <div className="flex flex-col gap-3 text-center text-sm text-muted-foreground">
          <p>
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium underline underline-offset-4">
              회원가입
            </Link>
          </p>
          <p>
            <Link
              href="/forgot-password"
              className="font-medium underline underline-offset-4"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            예매 링크를 받으셨다면 로그인 없이도 예매할 수 있어요. 받은 링크를 직접
            열고, 예매 내역은 그 링크의 &lsquo;비회원 예약 조회&rsquo;에서 이메일과
            비밀번호로 확인하세요.
          </p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            <Sparkles className="size-4" />
            어스테이지 사용방법
          </Link>
        </div>
      </div>
    </main>
  );
}
