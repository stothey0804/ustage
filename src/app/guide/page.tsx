import type { Metadata } from "next";
import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ClipboardList,
  Link2,
  Mail,
  QrCode,
  ScanLine,
  Shuffle,
  Ticket,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "어스테이지 사용 방법",
  description:
    "공연 명단 관리와 당일 입장 처리를 위한 어스테이지 — 비공개 예매 링크, 이메일 자동 발송, QR 입장, 현장 추첨까지 화면과 함께 안내합니다.",
  alternates: { canonical: "/guide" },
};

type IconType = ComponentType<{ className?: string }>;

/** 스크린샷 한 장 — 모바일은 프레임 폭을 좁게, 데스크톱은 넓게 보여준다. */
type Shot = {
  src: string;
  alt: string;
  /** 실제 캡처 크기 (2배 스케일) */
  width: number;
  height: number;
  kind: "mobile" | "desktop";
};

type Section = {
  icon: IconType;
  title: string;
  lead: string;
  points: string[];
  shots: Shot[];
};

const mobile = (src: string, alt: string): Shot => ({
  src,
  alt,
  width: 780,
  height: 1688,
  kind: "mobile",
});

const desktop = (src: string, alt: string): Shot => ({
  src,
  alt,
  width: 3040,
  height: 2000,
  kind: "desktop",
});

const SECTIONS: Section[] = [
  {
    icon: ClipboardList,
    title: "왜 만들었나",
    lead: "공연 명단 관리와 당일 입장 처리를 한 곳에서 끝내기 위해 만들었습니다.",
    points: [
      "예매자 명단을 메신저·스프레드시트로 나눠 관리하면 입금 확인과 입장 확인이 어긋납니다.",
      "어스테이지는 신청부터 입금 확인, 현장 입장까지 하나의 명단 위에서 처리합니다.",
      "명단 화면은 데스크톱 기준으로 설계했습니다 — 한 화면에서 훑고 바로 처리합니다.",
    ],
    shots: [desktop("/guide/07-roster.png", "예매 명단 관리 화면")],
  },
  {
    icon: Link2,
    title: "등록한 공연을 비공개 링크로 공유",
    lead: "스테이지를 만들면 검색으로는 찾을 수 없는 예매 링크가 생기고, 그 링크에 예매 폼이 함께 담깁니다.",
    points: [
      "포스터·안내·일시·장소·가격·좌석 수를 채우면 링크가 만들어집니다.",
      "링크를 받은 사람만 예매할 수 있습니다 — 메인에서 검색·발견되지 않습니다.",
      "링크 복사와 QR 공유를 지원해 포스터·SNS에 바로 붙일 수 있습니다.",
    ],
    shots: [
      mobile("/guide/03-booking-page.png", "예매 페이지 — 공연 정보와 매수 선택"),
      mobile("/guide/04-booking-form.png", "예매자 정보 입력 화면"),
    ],
  },
  {
    icon: Mail,
    title: "신청·입금 확정 시 이메일 자동 발송",
    lead: "참석자가 따로 물어보지 않아도 상태가 바뀔 때마다 메일이 나갑니다.",
    points: [
      "신청 직후: 유료는 계좌·금액이 담긴 입금 안내, 무료는 즉시 확정 안내.",
      "주최자가 입금을 확인하면: 입장 QR이 담긴 확정 메일.",
      "취소 시에도 안내 메일이 발송됩니다. 모든 안내는 이메일로만 보냅니다.",
    ],
    shots: [],
  },
  {
    icon: Ticket,
    title: "로그인, 카카오, 그리고 비회원 예매",
    lead: "계정은 하나입니다. 같은 계정으로 공연을 열고, 다른 공연을 예매합니다.",
    points: [
      "이메일+비밀번호 또는 카카오로 로그인합니다. 카카오는 이메일을 주지 않아 로그인 후 사용할 주소를 한 번 받습니다.",
      "비회원도 예매할 수 있습니다 — 이메일과 비밀번호(4자 이상)만 받습니다.",
      "로그인 회원은 예매 내역이 계정에 쌓이고, 비회원은 이메일+비밀번호로 조회합니다.",
    ],
    shots: [
      mobile("/guide/01-main-login.png", "메인 겸 로그인 화면"),
      mobile("/guide/05-home.png", "로그인 후 홈 — 내 티켓과 내 스테이지 요약"),
    ],
  },
  {
    icon: QrCode,
    title: "입장 QR과 입장번호 발급",
    lead: "예매 내역을 열면 입장에 필요한 QR과 예매번호가 함께 있습니다.",
    points: [
      "회원은 내 티켓에서, 비회원은 예매 링크의 ‘비회원 예약 조회’에서 이메일+비밀번호로 확인합니다.",
      "QR은 매수만큼 발급됩니다 — 2매면 2장, 한 장씩 따로 입장할 수 있습니다.",
      "예매번호는 스테이지별 신청 순번(#1, #2 …)이라 현장에서 부르기 쉽고 추첨에도 그대로 쓰입니다.",
    ],
    shots: [mobile("/guide/06-my-tickets.png", "내 티켓 — 상태와 예매번호")],
  },
  {
    icon: ScanLine,
    title: "공연 당일, QR로 간편 입장",
    lead: "휴대폰 카메라로 QR을 비추면 바로 입장 처리됩니다.",
    points: [
      "스캔하면 이름·입금 상태·입장 여부가 즉시 표시됩니다.",
      "입금이 확인되지 않은 예매는 경고로 막고, 이미 입장한 티켓은 ‘재입장 시도’로 알려줍니다.",
      "QR에는 개인정보 없이 무작위 토큰만 담겨 있습니다.",
    ],
    shots: [desktop("/guide/10-scan.png", "QR 스캔 입장 확인 화면")],
  },
  {
    icon: Shuffle,
    title: "현장 추첨",
    lead: "실제로 입장한 참석자만 대상으로, 여러 번 뽑을 수 있습니다.",
    points: [
      "QR 스캔으로 입장 처리된 예매만 후보가 됩니다 — 오지 않은 사람은 뽑히지 않습니다.",
      "‘이전 당첨자 제외’를 켜면 회차를 이어가며 중복 없이 뽑습니다. 기록은 저장되어 새로고침해도 유지됩니다.",
      "결과는 예매번호와 마스킹된 이름·이메일로 표시합니다 — 화면을 함께 봐도 개인정보가 드러나지 않습니다.",
    ],
    shots: [
      desktop("/guide/08-draw-rolling.png", "추첨 중 — 후보 번호가 굴러가는 화면"),
      desktop("/guide/08-draw.png", "추첨 결과 — 당첨 예매번호를 크게 표시"),
    ],
  },
];

const EXTRA: Section = {
  icon: UserPlus,
  title: "현장에서 받은 예매도 명단에",
  lead: "당일 현장 결제·현금 예매를 주최자가 직접 명단에 추가할 수 있습니다.",
  points: [
    "이름·이메일·매수만 입력하면 되고, 예매가 마감된 뒤에도 등록됩니다.",
    "‘바로 입금확인’으로 만들면 입장 QR 메일이 즉시 발송됩니다.",
    "조회용 비밀번호 4자리는 자동 생성되어 그 자리에서 안내할 수 있습니다.",
  ],
  shots: [desktop("/guide/09-onsite.png", "현장 예매 추가 화면")],
};

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 space-y-12">
      <header className="space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          처음으로
        </Link>

        <div className="flex items-center gap-2">
          <BrandMark className="size-8" />
          <Wordmark className="text-xl" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            공연 명단 관리와 당일 입장 처리를
            <br />
            링크 하나로
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            어스테이지(us.tage)는 소규모 공연·강연을 위한 예매 서비스입니다. 비공개
            링크로 예매를 받고, 입금을 확인하면 QR 티켓이 나가고, 당일에는 QR로
            입장시키고 추첨까지 진행합니다.
          </p>
        </div>
      </header>

      <div className="space-y-12">
        {[...SECTIONS, EXTRA].map((section, index) => (
          <SectionBlock key={section.title} section={section} index={index + 1} />
        ))}
      </div>

      <footer className="space-y-3 border-t pt-8">
        <p className="text-sm text-muted-foreground">
          지금 쓰는 계정으로 첫 스테이지를 만들 수 있습니다. 좌석 수와 가격만 정하면
          바로 예매 링크가 생깁니다.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/dashboard/events/new">스테이지 만들기</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">로그인 화면으로</Link>
          </Button>
        </div>
      </footer>
    </main>
  );
}

function SectionBlock({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  const { icon: Icon, title, lead, points, shots } = section;

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-3xl bg-primary/10">
          <Icon className="size-4.5 text-primary" />
        </span>
        <div className="space-y-1">
          <p className="font-mono text-xs text-primary">
            {String(index).padStart(2, "0")}
          </p>
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed">{lead}</p>

      <ul className="space-y-1.5">
        {points.map((point) => (
          <li
            key={point}
            className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground"
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            {point}
          </li>
        ))}
      </ul>

      {shots.length > 0 && (
        <div
          className={
            shots[0].kind === "mobile"
              ? "flex flex-wrap gap-4"
              : "space-y-4"
          }
        >
          {shots.map((shot) => (
            <figure
              key={shot.src}
              className={
                shot.kind === "mobile"
                  ? "w-[176px] overflow-hidden rounded-4xl bg-card shadow-md ring-1 ring-foreground/5 sm:w-[220px]"
                  : "overflow-hidden rounded-4xl bg-card shadow-md ring-1 ring-foreground/5"
              }
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                className="h-auto w-full"
                sizes={shot.kind === "mobile" ? "220px" : "(max-width: 768px) 100vw, 768px"}
              />
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
