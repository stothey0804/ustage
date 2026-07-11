import type { Metadata } from "next";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  Banknote,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  KeyRound,
  Link2,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Share2,
  Ticket,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { EventStatusBadge, BookingStatusBadge } from "@/components/StatusBadge";

export const metadata: Metadata = {
  title: "어스테이지 사용 방법",
  description:
    "링크 하나로 예매부터 QR 입장까지 — 어스테이지 사용 가이드. 공연자와 참석자의 흐름을 단계별로 안내합니다.",
  alternates: { canonical: "/guide" },
};

type IconType = ComponentType<{ className?: string }>;

const PILLARS: { icon: IconType; text: string }[] = [
  { icon: Link2, text: "링크 공유형 · 비공개" },
  { icon: Wallet, text: "계좌이체 · 수동 확인" },
  { icon: QrCode, text: "QR 입장 확인" },
];

const ROLES: { icon: IconType; title: string; items: string[] }[] = [
  {
    icon: Calendar,
    title: "공연자 (주최)",
    items: [
      "이벤트 생성·수정, 포스터·안내 작성",
      "티켓 오픈하고 예매 링크 공유",
      "예매 명단 관리 · 입금 확인",
      "현장에서 QR 스캔으로 입장 확인",
    ],
  },
  {
    icon: Ticket,
    title: "참석자",
    items: [
      "받은 링크로 예매 (회원/비회원)",
      "계좌로 입금 후 확인 대기",
      "확정되면 QR 코드 발급",
      "비회원은 이메일+비밀번호로 조회",
    ],
  },
];

const FLOW: { icon: IconType; label: string }[] = [
  { icon: Plus, label: "이벤트 생성" },
  { icon: Ticket, label: "티켓 오픈" },
  { icon: Share2, label: "링크 공유" },
  { icon: Edit, label: "참석자 예매" },
  { icon: CheckCircle, label: "입금 확인" },
  { icon: ScanLine, label: "QR 입장" },
];

const STEPS: { icon: IconType; title: string; desc: string }[] = [
  {
    icon: Edit,
    title: "이벤트 만들기",
    desc: "제목·일시·장소·가격·입금 계좌를 입력하고, 정원·예매기간·포스터·안내·커스텀 질문을 더합니다. 생성 시 상태는 ‘오픈 전’이에요.",
  },
  {
    icon: Share2,
    title: "티켓 오픈 & 링크 공유",
    desc: "상태를 ‘티켓 오픈’으로 바꾸고(예매기간 필요) 예매 링크를 복사해 오픈채팅·DM으로 공유합니다. 링크를 받은 사람만 접근할 수 있어요.",
  },
  {
    icon: Search,
    title: "예매 명단 관리 & 입금 확인",
    desc: "이름·이메일로 검색하고 상태로 필터·정렬합니다. 입금이 확인되면 ‘입금대기 → 입금완료’로 바꿔 주세요. 취소·비밀번호 초기화도 가능합니다.",
  },
  {
    icon: ScanLine,
    title: "현장 입장 — QR 스캔",
    desc: "스캔 화면에서 참석자의 QR을 비추면 결과가 색으로 표시됩니다. 입금 미확정·재입장은 자동으로 막아줘요.",
  },
  {
    icon: Clock,
    title: "마감 & 종료",
    desc: "‘예매 마감’으로 닫거나(재오픈 가능) ‘행사 종료’로 마무리합니다. 예매 종료일·정원·행사일에 따라 자동으로도 전환됩니다.",
  },
];

const ATTENDEE: { icon: IconType; title: string; items: string[] }[] = [
  {
    icon: Edit,
    title: "예매하기",
    items: [
      "받은 링크 열기 → 공연 정보 확인 → [예매하기]",
      "이름·이메일·매수 입력 (비회원은 비밀번호도)",
      "유료면 입금자명·입금시간 입력 후 계좌로 송금",
      "무료 이벤트는 입금 절차 없이 즉시 참가 확정",
    ],
  },
  {
    icon: QrCode,
    title: "확인 & 입장",
    items: [
      "로그인: ‘내 예약’에서 확인",
      "비회원: 예매 페이지의 ‘예약 조회’ → 이메일+비밀번호",
      "확정되면 QR 코드 발급 → 현장에서 제시",
      "비회원은 이메일·비밀번호를 꼭 기억하세요",
    ],
  },
];

const TIPS: { icon: IconType; text: string }[] = [
  { icon: Banknote, text: "무료 이벤트는 입금자명·입금시간·계좌 안내가 없고 즉시 확정됩니다." },
  { icon: Clock, text: "정원이 차거나 예매 종료일이 지나면 자동으로 마감됩니다." },
  { icon: QrCode, text: "QR은 확정된 후에만 보이며 매수만큼 발급되고, 재입장은 경고됩니다." },
  { icon: KeyRound, text: "비회원 정보는 제출 후 수정할 수 없습니다 — 정확히 입력하세요." },
  { icon: CheckCircle, text: "QR에는 개인정보가 없습니다 — 무작위 토큰(UUID)만 담깁니다." },
];

const EVENT_STATES: { status: "draft" | "open" | "closed" | "ended"; desc: string }[] = [
  { status: "draft", desc: "작성 중, 예매 불가" },
  { status: "open", desc: "예매를 받는 중" },
  { status: "closed", desc: "예매 종료" },
  { status: "ended", desc: "행사 종료" },
];

const BOOKING_STATES: { status: string; desc: string }[] = [
  { status: "pending", desc: "입금/확인 전" },
  { status: "confirmed", desc: "확정 · QR 발급 (무료는 참가확정)" },
  { status: "cancelled", desc: "취소된 예매" },
];

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  items,
}: {
  icon: IconType;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

// 검색엔진·AI 검색(GEO)용 구조화 데이터 — HowTo(운영 절차) + BreadcrumbList(경로)
const GUIDE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HowTo",
      name: "어스테이지로 소규모 공연 예매 운영하기",
      description:
        "이벤트 생성부터 예매 링크 공유, 계좌이체 입금 확인, QR 입장 확인까지 어스테이지 운영 절차.",
      inLanguage: "ko-KR",
      step: STEPS.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.desc,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "사용 방법",
          item: `${SITE_URL}/guide`,
        },
      ],
    },
  ],
};

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(GUIDE_JSON_LD) }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        홈으로
      </Link>

      {/* 히어로 */}
      <header className="mt-8 flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-16" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            US.tage 사용 가이드
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            어스테이지 사용 방법
          </h1>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            링크 하나로 예매부터 QR 입장까지. 소규모 공연·강연을 위한 폐쇄형 예매
            시스템입니다.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/signup">시작하기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">로그인</Link>
          </Button>
        </div>
      </header>

      <div className="mt-14 space-y-14">
        {/* 소개 */}
        <section>
          <SectionHead eyebrow="소개" title="한 줄 소개" />
          <p className="text-base leading-relaxed text-muted-foreground">
            공연자가{" "}
            <span className="font-medium text-foreground">예매 링크를 공유</span>
            하면, 참석자는 그 링크로만 예매하고{" "}
            <span className="font-medium text-foreground">QR로 입장</span>합니다.
            결제는 계좌이체이며, 입금 확인은 주최자가 직접 처리합니다.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 두 역할 */}
        <section>
          <SectionHead eyebrow="역할" title="누가, 무엇을 하나요" />
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLES.map((role) => (
              <InfoCard key={role.title} {...role} />
            ))}
          </div>
        </section>

        {/* 전체 흐름 */}
        <section>
          <SectionHead eyebrow="전체 흐름" title="예매부터 입장까지" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FLOW.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-primary">
                    STEP {i + 1}
                  </div>
                  <div className="text-sm font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 공연자 단계 */}
        <section>
          <SectionHead eyebrow="공연자" title="이벤트 운영 5단계" />
          <ol className="space-y-3">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 참석자 */}
        <section>
          <SectionHead eyebrow="참석자" title="예매하고 입장하기" />
          <div className="grid gap-4 sm:grid-cols-2">
            {ATTENDEE.map((card) => (
              <InfoCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* 상태 배지 */}
        <section>
          <SectionHead eyebrow="상태" title="배지로 한눈에" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Calendar className="size-4 text-primary" />
                이벤트 상태
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {EVENT_STATES.map(({ status, desc }) => (
                  <li key={status} className="flex items-center gap-3">
                    <EventStatusBadge status={status} />
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Ticket className="size-4 text-primary" />
                예매 상태
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {BOOKING_STATES.map(({ status, desc }) => (
                  <li key={status} className="flex items-center gap-3">
                    <BookingStatusBadge status={status} />
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 참고 */}
        <section>
          <SectionHead eyebrow="참고" title="알아두면 좋은 것" />
          <ul className="space-y-3">
            {TIPS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex gap-3 rounded-2xl border bg-card p-4 text-sm"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 하단 CTA */}
        <section className="rounded-3xl border bg-primary/5 p-8 text-center">
          <BrandMark className="mx-auto size-12" />
          <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
            링크만 공유하면, 예매부터 입장까지 끝.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            지금 바로 첫 공연을 등록해 보세요.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">시작하기</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">로그인</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
