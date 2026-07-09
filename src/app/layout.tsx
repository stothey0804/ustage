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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "어스테이지 — 소규모 공연 예매 · QR 입장 시스템",
    template: "%s | 어스테이지",
  },
  description:
    "소규모 공연·강연을 위한 링크 공유형 예매 서비스. 공연자가 링크를 공유하면 참석자는 그 링크로만 예매하고, 계좌이체 입금 확인 후 QR 코드로 입장합니다.",
  keywords: [
    "공연 예매",
    "소규모 공연",
    "티켓 예매",
    "QR 입장",
    "예매 시스템",
    "공연 티켓",
    "비공개 예매",
    "어스테이지",
    "UStage",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "어스테이지",
    title: "어스테이지 — 소규모 공연 예매 · QR 입장 시스템",
    description:
      "공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요. 계좌이체 확인부터 QR 입장까지 한 번에.",
  },
  twitter: {
    card: "summary_large_image",
    title: "어스테이지 — 소규모 공연 예매 · QR 입장 시스템",
    description:
      "공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요. 계좌이체 확인부터 QR 입장까지 한 번에.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "어스테이지",
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
