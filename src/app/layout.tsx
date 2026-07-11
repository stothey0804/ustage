import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

// 검색엔진 소유확인(Search Console / 네이버 서치어드바이저 등) — 값이 설정된 것만 노출
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const NAVER_SITE_VERIFICATION = process.env.NAVER_SITE_VERIFICATION;

const verificationOther: Record<string, string> = {};
if (NAVER_SITE_VERIFICATION) {
  verificationOther["naver-site-verification"] = NAVER_SITE_VERIFICATION;
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "어스테이지(us.tage) — 소규모 공연 예매 · QR 입장 시스템",
    template: "%s | 어스테이지 us.tage",
  },
  description:
    "어스테이지(us.tage)는 소규모 공연·강연을 위한 링크 공유형 예매 서비스입니다. 공연자가 예매 링크를 공유하면 참석자는 그 링크로만 예매하고, 계좌이체 입금 확인 후 QR 코드로 입장합니다. 비회원도 이메일과 비밀번호로 예매·조회할 수 있습니다.",
  applicationName: "어스테이지",
  category: "business",
  keywords: [
    "어스테이지",
    "us.tage",
    "ustage",
    "공연 예매",
    "소규모 공연 예매",
    "강연 예매",
    "티켓 예매",
    "QR 입장",
    "QR 티켓",
    "예매 시스템",
    "예매 링크",
    "계좌이체 예매",
    "비공개 예매",
    "무료 예매 시스템",
    "선착순 예매",
  ],
  authors: [{ name: "어스테이지" }],
  creator: "어스테이지",
  publisher: "어스테이지",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "어스테이지 (us.tage)",
    title: "어스테이지(us.tage) — 소규모 공연 예매 · QR 입장 시스템",
    description:
      "공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요. 계좌이체 확인부터 QR 입장까지 한 번에.",
  },
  twitter: {
    card: "summary_large_image",
    title: "어스테이지(us.tage) — 소규모 공연 예매 · QR 입장 시스템",
    description:
      "공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요. 계좌이체 확인부터 QR 입장까지 한 번에.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "어스테이지",
  },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(Object.keys(verificationOther).length
      ? { other: verificationOther }
      : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head>
        <meta name="theme-color" content="#2b8a8a" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="48x48"
          href="/favicon-48.png"
        />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
