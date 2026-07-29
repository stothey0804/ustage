# Handoff: ustage 예매 flow · 명단 관리 · 앱 진입부 UI 개선

## Overview
어스테이지(ustage, 소규모 공연 예매 앱)의 세 화면군을 개선한 디자인입니다.

0. **로그인 · 홈 · 내 티켓 · 내 스테이지 · 가이드 (모바일)** — 앱 진입부 8화면(빈 상태 2종 포함). 계정은 하나이며 주최자와 참석자를 겸합니다.
1. **예매 flow (모바일)** — 관객이 비공개 예매 링크로 들어와 매수를 고르고, 정보를 입력하고, 계좌 입금 안내를 받고, 확정 QR 티켓을 받는 4화면.
2. **명단 관리 (데스크톱)** — 주최자가 예매 명단을 한 화면에서 훑고, 입금을 확인하고, 개별 예매자를 상세 확인하는 관리 화면. 모바일 대응은 범위에서 제외(요구사항).

핵심 개선점:
- 매수 선택을 별도 단계에서 없애고 상세 화면 하단 바로 끌어올림 → 예매 단계 4 → 3
- 정보 입력을 한 화면으로 통합, 상단에 진행 인디케이터(3분할 바)
- 입금 안내 화면에 계좌 복사 버튼 + 입금 기한 + 자동취소 규칙을 한 번에 노출 (이탈 구간 보강)
- 명단은 카드 리스트가 아닌 밀도 높은 테이블 + 요약 지표 + 다중 선택 일괄 처리 + 우측 상세 패널
- 역할 전환 스위치를 없애고 **하단 탭 4개(홈 · 내 티켓 · 내 스테이지 · 마이페이지)** 로 통합. 탭은 주최 이력과 무관하게 항상 4개가 보이고, 내역이 없는 탭은 빈 상태로 안내
- 홈은 목록이 아니라 **요약** — 다가오는 내 티켓 1건 + 가장 가까운 내 스테이지(좌석·입금대기) + 각 섹션의 "전체 보기"

## About the Design Files
이 폴더의 HTML 파일들은 **디자인 레퍼런스**입니다 — 의도한 화면과 동작을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아닙니다. 대상 코드베이스(React/Next, Vue, SwiftUI, native 등)의 기존 패턴·컴포넌트 라이브러리로 **재구현**하는 것이 과제입니다. 실제 ustage 코드베이스는 이미 `ustage@0.1.0` React 라이브러리(Tailwind v4 + shadcn 관용구, `lucide-react` 아이콘)를 쓰므로, 아래 컴포넌트 이름은 그 라이브러리의 실제 export와 1:1 대응합니다. 프로토타입은 `lucide-react`를 쓸 수 없어 `Icon` 래퍼를 썼지만, 프로덕션에서는 `lucide-react`를 직접 import하세요.

환경이 아직 없다면 프로젝트에 가장 적합한 프레임워크를 고르고 그 위에서 구현하면 됩니다.

## Fidelity
**High-fidelity.** 최종 컬러·타이포·간격·상태까지 확정된 목업입니다. 색상과 반경은 하드코딩 대신 디자인 토큰(`tokens/*.css`의 CSS 변수 / Tailwind 테마)을 사용해 픽셀 단위로 재현하세요. 컬러 팔레트는 기존 시스템 그대로이며 변경하지 않았습니다.

사용한 디자인 시스템 컴포넌트: `Button`, `Input`, `Textarea`, `Label`, `Separator`, `Avatar`/`AvatarFallback`, `EventStatusBadge`, `BookingStatusBadge`, `CopyButton`, `Wordmark`, `BrandMark`, `Icon`.

**타이포 변경 한 가지**: 본문 서체는 Inter 대신 **Pretendard**(Variable, 동적 서브셋)를 씁니다 — 한글 본문 가독성 때문입니다. `--font-sans`만 교체하고 크기·굵기 체계와 나머지 토큰은 그대로이며, 숫자·계좌번호·예약번호는 계속 Geist Mono입니다.

## Screens / Views

### Z. 로그인 · 홈 · 내 티켓 · 내 스테이지 · 가이드 (mobile) — `메인 로그인 가이드.dc.html`
프레임 **390 × 844**, 좌우 패딩 20px. 구조는 `header / body(overflow hidden) / 하단 탭바`이며, 화면 고유 CTA가 있으면 탭바 위에 놓습니다.

**내비게이션 원칙**
- 계정은 하나. 주최자도 참석자가 될 수 있으므로 역할 전환 UI를 두지 않습니다.
- 하단 탭 **4개 고정**: 홈 / 내 티켓 / 내 스테이지 / 마이페이지. 주최 이력이 없어도 내 스테이지 탭을 숨기지 않고, 들어가면 빈 상태로 안내합니다(Z7).
- 탭바: 상단 1px border, `--card` 배경, 패딩 `8px 12px 12px`, `grid-template-columns: repeat(4, 1fr)`. 항목 = 아이콘 20px(lucide house / ticket / mic / circle-user, 2px stroke) + 라벨 11px, 활성 `--primary` + 500, 비활성 `--muted-foreground`. 항목 높이 44px 이상 확보.
- **알림 패널·알림 아이콘은 없습니다.** 헤더 우측은 도움말(lucide circle-help, ghost icon-sm) → 가이드(Z8)로 이동. 마이페이지는 탭으로만 접근.

#### Z1. 로그인
- **Purpose**: 비밀번호 없이 메일 링크로 로그인(매직 링크). 로그인 없이도 예약번호로 예매 조회 가능.
- **Layout**: 프레임 전체 세로 중앙 정렬, 블록 사이 gap 32px, 하단 약관/조회 영역(패딩 하단 28px).
- **Components**:
  - `BrandMark` 56×56 (앱 마크 — 시스템에서 유일하게 그라디언트가 허용된 요소).
  - 카피: `h2` 24px/700, letter-spacing −0.02em, line-height 1.35 — "작은 공연의 예매를 / 링크 하나로"(2줄 강제). 본문 13px/1.7 muted "예매한 티켓과 내가 여는 스테이지를 한 계정에서 관리합니다."
  - `Label`("이메일") + `Input` placeholder "공연 안내를 받을 이메일" + 헬프텍스트 12px muted "비밀번호 없이, 메일로 받은 링크로 로그인합니다."
  - `Button size=lg className="w-full"` **"로그인 링크 받기"** — 이 화면의 유일한 solid primary.
  - 구분선: `1px var(--border)` 좌우 flex + 중앙 "또는" 12px muted, gap 12px. 그 아래 `Button variant=outline size=lg w-full` "카카오로 계속하기" — 카카오 브랜드 컬러 유지(배경/보더 #FEE500, 텍스트 rgba(0,0,0,0.85)), 높이 40px·반경 26px·타이포는 DS Button 그대로. 소셜 로그인 미사용 시 숨김(`showKakao`).
  - 하단: 약관 문구 12px/1.6 muted + "로그인 없이 예매를 확인하려면" + `Button variant=link size=xs` "예약번호로 조회".
- **States**: 메일 형식 오류 시 `aria-invalid`(destructive 보더 + 링). 전송 후 "메일을 확인해주세요"로 교체, 재전송 60초 쿨다운.

#### Z2. 홈 — 주최 이력이 있는 계정
- **Purpose**: 두 역할의 "지금"만 요약. 예매한 다음 공연과, 내가 여는 가장 가까운 공연의 처리할 일.
- **Header**: `Wordmark` + 우측 도움말 아이콘(circle-help, ghost icon-sm) → 가이드. 패딩 `16px 20px 12px`.
- **Body** (gap 20px):
  - 인사 블록: 20px/700 "유하님, 공연이 6일 남았어요" + 13px muted "입금대기 4건을 확인하면 QR 티켓이 발송됩니다."(0건이면 "확인할 입금이 없어요").
  - **내 티켓 요약**: 섹션 헤더 "내 티켓 1장" 13px/600 + `Button variant=ghost size=xs` "전체 보기". 카드 = radius 26px, `--input` 50% 틴트, 패딩 16px — 56×56 QR 썸네일(radius 16px, `--card`) + 제목 14px/500 + 일시·매수 12px muted + 우측 `BookingStatusBadge`.
  - **내가 여는 스테이지 요약**: 섹션 헤더 + "전체 보기". 카드 = radius 26px, `--card` + shadow-md + 헤어라인, 패딩 20px, 행 gap 14px — `EventStatusBadge status="open"` + "가장 가까운 공연 · D-6" → 제목 17px/600 → 일시·장소 12px muted → 좌석 행(13px/500 + Geist Mono `17 / 40석` `--primary`) + 6px progress → `Separator` → "입금대기 4건" 13px/500 + "가장 오래된 건 2일 경과" 12px muted + 우측 `Button size=sm` **"명단 확인"**(이 화면의 유일한 solid primary, 명단 관리 화면으로 이동).
- **Bottom**: 탭바만(홈 활성). 별도 CTA 없음 — 생성은 내 스테이지 탭에서.
- **홈과 내 스테이지의 차이**: 홈은 요약 1건 + 바로 할 액션 하나. 내 스테이지는 전체 목록, 작성 중(draft) 항목, 지난 공연·정산까지.

#### Z3. 홈 — 예매만 하는 계정
- **Purpose**: 주최 이력이 없는 계정의 홈. 티켓 요약 + 스테이지를 열어보는 안내.
- **Body** (gap 20px):
  - 인사 블록: "서연님, 다음 공연이 18일 남았어요" + "입금대기 1건이 있어요. 기한 안에 입금하면 확정됩니다."
  - **내 티켓 2장** 섹션: 항목 2개(Z2 티켓 카드와 동일 형태, 상태 배지 confirmed/pending).
  - **유도 카드**: radius 26px, `--card` + shadow-md + 헤어라인, 패딩 20px — "공연을 열어보고 싶다면" 15px/600 + 설명 13px/1.7 muted("지금 쓰는 계정으로 스테이지를 만들 수 있습니다. 좌석 수와 가격을 정하면 비공개 예매 링크가 만들어지고, 내 스테이지 탭에서 명단을 관리합니다.") + `Button size=lg w-full` **"스테이지 만들기"** + `Button variant=ghost size=sm w-full` "예매를 여는 순서 보기".
- **Bottom**: 탭바 4개 그대로(내 스테이지 탭도 보임).

#### Z4. 내 티켓 (참석자)
- **Header**: 제목 "내 티켓" 17px/700 + `Button variant=ghost size=xs` "예약번호로 찾기".
- **Body** (gap 20px):
  - **다가오는 티켓 카드**: radius 26px, `--card` + shadow-md + 헤어라인, 패딩 20px — `BookingStatusBadge status="confirmed"` + "18일 뒤 · 입장 19:30부터" → 제목 17px/600 + 일시·장소 12px muted → QR 블록(radius 22px, `--input` 50% 틴트, 패딩 14px: 68×68 QR + 예약번호 Geist Mono 13px + "1매 · 20,000원 입금완료" 12px muted) → `Button size=lg w-full` **"QR 티켓 보기"**.
  - **입금 확인 중** 섹션: 항목 1개(제목 14px/500 + "2월 14일 (토) 19:30 · 2매 · 2월 10일까지 입금" 12px muted + `BookingStatusBadge status="pending"`).
  - **지난 티켓** 섹션: 제목·메타 muted 처리 + `Button variant=ghost size=xs` "영수증".
- **Bottom**: 탭바(내 티켓 활성).

#### Z5. 내 스테이지 (주최자)
- **Header**: 제목 "내 스테이지" + 우측 개수 "3개 · 진행 중 1개" 12px muted.
- **Body** (gap 10px): 스테이지 카드 3장 — radius 26px, `--card` + shadow-md + 헤어라인, 패딩 18px, 내부 gap 12px.
  상단 행 `EventStatusBadge` + 시점("D-6" / "3월 7일" / "지난 공연") 12px muted → 제목 15px/600(ellipsis) + 메타 12px muted → 하단 행 상태 노트(진행 중은 "입금대기 4건" `--primary`, 그 외 muted) + `Button variant=outline size=xs`("명단" / "이어 쓰기").
- **CTA**: 탭바 위 `Button size=lg w-full` **"스테이지 만들기"**(패딩 `0 20px 12px`).
- **Bottom**: 탭바(내 스테이지 활성).

#### Z6. 내 티켓 — 내역 없음
- 아이콘 40px(lucide ticket, stroke 1.5, opacity 0.6) → "아직 예매한 공연이 없습니다" 15px/600 → 설명 13px/1.7 muted "받은 예매 링크로 예매하면 QR 티켓이 여기에 모입니다. 로그인 전에 예매했다면 예약번호로 찾아 계정에 담을 수 있어요." → `Button size=lg` "예약번호로 찾기". body를 세로·가로 중앙 정렬(gap 20px).

#### Z7. 내 스테이지 — 내역 없음
- 아이콘 40px(lucide mic) → "아직 등록한 스테이지가 없습니다" → "첫 스테이지를 만들어 예매 링크를 공유해보세요. 좌석 수와 가격만 정하면 바로 열립니다." → `Button size=lg w-full` "스테이지 만들기" + `Button variant=ghost size=lg w-full` "예매를 여는 순서 보기". 헤더 우측에도 도움말 아이콘.

#### Z8. 가이드 (예매 여는 순서)
- **Header**: back + "가이드". 홈/내 스테이지의 도움말 아이콘이 이 화면으로 들어옵니다.
- **Body** (gap 18px):
  - 제목 22px/700 "예매는 세 단계로 열립니다" + 본문 13px/1.7 muted "10분이면 예매 링크를 공유할 수 있어요."
  - **스텝 카드 3개** (gap 10px): radius 26px, `--card` + shadow-md + 헤어라인, 패딩 `14px 16px`, 좌측 26px 원형 번호(`primary 10%` 배경, `--primary`, Geist Mono 12px) + 제목 15px/600 · 설명 13px/1.7 muted · 힌트 12px `--primary`.
    1. 스테이지 만들기 / "5분 소요"
    2. 예매 링크 공유하기 / "링크는 언제든 마감할 수 있어요"
    3. 입금 확인하고 QR 보내기 / "여러 건을 한 번에 확인할 수 있어요"
  - **FAQ**: radius 26px, `--input` 50% 틴트, 패딩 16px — "자주 묻는 것" 13px/600 + 질문 2개(13px, 우측 chevron-down, 사이 `Separator`). 열림 시 chevron 180° + 답변 13px/1.7 muted.
- **Bottom bar**: `Button size=lg w-full` "첫 스테이지 만들기" + `Button variant=ghost size=lg w-full` "예매자에게 보이는 화면 보기".

### A. 예매 flow (mobile) — `예매 플로우.dc.html`
프레임 기준 **390 × 844**, 컨텐츠 1컬럼, 좌우 패딩 20px. 각 화면은 `header(고정) / body(스크롤) / bottom bar(고정)` 3단 구조. bottom bar는 `border-top: 1px solid var(--border)`, 패딩 `14px 20px 20px`, 내부 gap 8~12px.

#### A1. 스테이지 상세 · 매수 선택
- **Purpose**: 공연 정보 확인 후 매수를 고르고 예매 시작.
- **Header**: `Button variant=ghost size=icon-sm`(chevron-left) · 중앙 "예매" 12px muted · 우측 `Button variant=ghost size=xs` "공유". 패딩 `14px 12px 8px`.
- **Body** (gap 18px):
  - 포스터 슬롯: 폭 100%, 높이 208px, radius 26px. 프로덕션에서는 스테이지 대표 이미지(없으면 `--input` 50% 틴트 플레이스홀더 + "포스터를 등록해주세요").
  - 상태 줄: `EventStatusBadge status="open"`("티켓 오픈") + "비공개 예매 링크" 12px muted, gap 8px.
  - 제목 `h2` 22px/700, letter-spacing −0.02em, line-height 1.3. 부제 13px muted ("유하 · 어쿠스틱 단독 공연").
  - 정보 블록: radius 26px, `background: color-mix(in oklab, var(--input) 50%, transparent)`, 패딩 16px, 행 gap 10px. 각 행 `space-between`, 13px — 라벨 muted / 값 500. 일시 "2026년 2월 14일 (토) 19:30", 장소 "연남동 스튜디오 온", 가격 "25,000원"(0원이면 "무료").
  - 잔여 좌석: 라벨 13px/500 + 우측 `22 / 40석` (Geist Mono 13px, `--primary`). 아래 6px 높이 progress (`--secondary` 트랙, `--primary` 채움, radius 999px, width = 확정좌석/총좌석). 캡션 "입금 순서대로 좌석이 확정됩니다." 12px muted.
  - 소개문 13px/1.7 muted, `text-wrap: pretty`.
- **Bottom bar**: "매수" 라벨 + 스텝퍼(`Button variant=outline size=icon-sm` −/+, 사이 값 Geist Mono 15px, min-width 20px 중앙정렬, 범위 1–4) → 총 결제금액 행(라벨 12px muted / 금액 18px/700) → `Button size=lg className="w-full"` **"예매하기"** (유일한 solid primary).

#### A2. 예매자 정보
- **Purpose**: 이름/연락처/이메일/입금자명을 한 화면에서 받기.
- **Header**: back + "예매자 정보". 바로 아래 진행 인디케이터 — 3분할 3px 바, gap 6px, 채워진 2칸 `--primary`, 나머지 `--secondary`.
- **Body** (gap 20px):
  - 요약 카드: radius 26px, `color-mix(in oklab, var(--primary) 8%, transparent)`, 패딩 `14px 16px`. 제목 14px/600, 서브 12px muted "2026년 2월 14일 (토) 19:30 · 2매".
  - 필드 그룹 gap 16px, 라벨→컨트롤 6px. `Label` + `Input`(placeholder: "예매자 성함", "010-0000-0000", "QR 티켓을 받을 이메일", "입금하실 분의 성함"). 연락처 아래 헬프텍스트 12px muted "공연 변경 안내를 문자로 보내드려요."
  - 입금자명 아래 체크박스: 18px 정사각, radius 6px, on = `--primary` 채움 + 흰 체크, off = 투명 + `1px solid var(--border)`. 라벨 13px muted "예매자 이름과 동일합니다". 기본 on.
- **Bottom bar**: "2매" 12px muted ↔ 총액 18px/700 / 안내문 12px/1.6 muted "다음 화면에서 계좌를 안내드립니다. 입금 확인 후 확정 메일이 발송됩니다." / `Button size=lg w-full` **"입금 안내 받기"**.

#### A3. 입금 안내
- **Purpose**: 계좌 확인·복사와 입금 기한 인지.
- **Body** (gap 20px):
  - 금액 블록: 세로 중앙정렬, 패딩 `24px 20px`, radius 26px, `--input` 50% 틴트. `BookingStatusBadge status="pending"`("입금대기") → 금액 30px/700 → "2매 · 예약번호 BK-2026-0214-018" 12px muted.
  - 기한 배너: radius 22px, `color-mix(in oklab, var(--primary) 10%, transparent)`, 패딩 `14px 16px`, 좌측 calendar 아이콘(size-4) + "2월 10일 23:59까지 입금" 13px/500 `--primary`, 우측 남은 시간 Geist Mono 13px.
  - 계좌 카드: radius 26px, `--card` + `shadow-md` + `1px ring-foreground/5` 헤어라인, 패딩 20px, 행 gap 14px. 은행 행 → 계좌번호 행(Geist Mono 15px/500 + `CopyButton label="복사"`) → `Separator` → 예금주 / 입금자명.
  - 안내: "확인해주세요" 13px/600 + 본문 13px/1.7 muted (입금자명 불일치 지연, 확인 후 QR 확정 메일, 기한 초과 자동취소).
- **Bottom bar**: `Button size=lg w-full` **"입금했어요"** + `Button variant=ghost size=lg w-full` "예매 내역 보기".

#### A4. 확정 · QR 티켓
- **Body** (gap 20px, 가운데 정렬): `BookingStatusBadge status="confirmed"`("입금완료") → 제목 20px/700 "입금이 확인되었어요" + 13px muted "입장할 때 이 QR을 보여주세요." → 티켓 카드(radius 26px, `--card` + shadow-md + 헤어라인, 패딩 24px): QR 180×180 radius 16px → 예약번호 Geist Mono 13px → `Separator` → 일시/장소/매수 행(13px) → 하단 캡션 12px muted "공연 시작 30분 전부터 입장할 수 있습니다."
- **Bottom bar**: 가로 2분할 gap 8px — `Button variant=outline size=lg flex-1` "캘린더에 저장" + `Button size=lg flex-1` "티켓 공유".

### B. 명단 관리 (desktop) — `명단 관리.dc.html`
최소 폭 **1480px**(디자인 기준 1520). 상단 앱바 → 페이지 헤더 → 요약 지표 4개 → 본문 2컬럼(테이블 `flex:1` + 상세 패널 360px, gap 24px). 페이지 패딩 `32px 48px 64px`, 섹션 gap 24px.

- **App bar**: 높이 auto(패딩 `16px 48px`), `--card` 배경, 하단 1px border. 좌측 `Wordmark` + 탭형 `Button size=sm`(활성 secondary, 나머지 ghost): 명단 / 스테이지 / 정산. 우측 사용자명 13px muted + `Avatar size=sm`.
- **Page header**: 좌측 `EventStatusBadge status="open"` + "2026년 2월 14일 (토) 19:30 · 연남동 스튜디오 온" 12px muted, 그 아래 `h1` 26px/700. 우측 `Button variant=outline size=sm` "예매 링크 복사", "명단 내보내기", `variant=secondary` "마감하기" (gap 8px).
- **요약 지표**: `grid-template-columns: repeat(4,1fr)`, gap 16px. 카드 = radius 26px, `--card`, shadow-md, 헤어라인, 패딩 `20px 24px`, 내부 gap 6px. 라벨 12px muted / 값 24px/700 / 서브 12px muted.
  1. 총 예매 `12건` · 서브 "티켓 21매"(취소 제외 합)
  2. 입금완료 `7건`(값 색 `--primary`) · 서브 "425,000원 입금"
  3. 입금대기 `4건` · 서브 "가장 오래된 건 2일 경과"
  4. 좌석 `17 / 40석` + 6px progress
- **툴바**: 좌측 상태 필터 칩 4개 — 높이 32px, 패딩 `0 14px`, radius 999px, 13px/500. 활성 `--primary`/`--primary-foreground`, 비활성 `--secondary`/`--muted-foreground`. 라벨에 건수 포함("전체 12", "입금대기 4", "입금완료 7", "취소 1"). 우측 240px `Input` placeholder "이름 · 예약번호 · 입금자명 검색".
- **테이블 카드**: radius 26px, `--card`, shadow-md, 헤어라인, `overflow: hidden`.
  - **일괄 바** (항상 존재, min-height 56px, 패딩 `12px 20px`, 하단 1px border): 전체선택 체크박스(18px, radius 6px) + 라벨("전체 선택" / "N건 선택"). 선택이 있으면 배경 `color-mix(in oklab, var(--primary) 10%, transparent)`로 바뀌고 우측에 `Button size=sm` "입금 확인", `variant=outline` "확정 메일 보내기", `variant=destructive` "취소 처리".
  - **그리드 컬럼(헤더·행 공통, `box-sizing: border-box`)**: `40px minmax(150px,1fr) 140px 56px 88px 130px 120px 92px 96px` — 체크박스 / 예매자 / 예약번호 / 매수 / 금액 / 입금자명 / 신청일시 / 상태 / 액션. 좌우 패딩 20px.
  - **헤더 행**: 높이 40px, 12px muted, 하단 1px border. "예매자"와 "신청일시"는 정렬 토글 버튼(활성 시 라벨 뒤 ↑/↓).
  - **데이터 행**: 패딩 `9px 20px`(compact, 기본) / `14px 20px`(comfortable), 하단 1px border, 행 전체 클릭 → 상세 패널. 배경: 선택 시 `primary 8%`, 미선택 입금대기 강조 시 `input 40%`, 그 외 투명.
    - 예매자: `Avatar size=sm`(fallback = 이름 뒤 2자) + 이름 13px/500 + 연락처 12px muted (넘치면 ellipsis)
    - 예약번호 Geist Mono 12px muted · 매수 "2매" · 금액 "50,000원"(취소는 "—")
    - 입금자명: 이름 13px + 예매자명과 다르면 "불일치" 칩 (11px/500, 패딩 `1px 8px`, radius 999px, `destructive 10%` 배경 / `--destructive` 텍스트)
    - 상태: `BookingStatusBadge`(입금대기 / 입금완료 / 취소)
    - 액션: 입금대기 행에만 `Button variant=outline size=xs` "입금 확인" (우측 정렬, `stopPropagation`)
  - **푸터**: 패딩 `14px 20px`, 12px muted — 좌측 "총 N건 표시 · 입금완료 N건 · 입금대기 N건", 우측 "입금 확인은 되돌릴 수 있습니다."
- **상세 패널** (360px, radius 26px, `--card`, shadow-md, 헤어라인, 패딩 24px, gap 20px):
  - 헤더: `Avatar`(40px) + 이름 16px/600 + 연락처 12px muted + 우측 `BookingStatusBadge`
  - 정보 블록: radius 22px, `--input` 50% 틴트, 패딩 16px, 행 gap 12px — 예약번호(Geist Mono) / 매수 / 금액 / 입금자명 / 이메일 / 신청일시
  - 진행 타임라인: "진행" 13px/600 + 3단계(예매 신청 → 입금 확인 → QR 티켓 발송). 각 행 = 6px 점(완료 `--primary`, 미완료 `--border`) + 라벨 13px + 시각 Geist Mono 12px muted("대기"/"예정" 포함)
  - 주최자 메모: `Label` + `Textarea rows=3` placeholder "이 예매자에게만 보이지 않는 메모입니다"
  - 액션: `Button size=lg w-full` — 입금대기면 "입금 확인하기", 확정이면 "확정 메일 다시 보내기". 아래 2분할 `Button variant=outline size=sm flex-1` "문자 보내기" + `variant=destructive` "예매 취소"
  - 선택 없음 상태: "예매자를 선택해주세요" 14px/500 + 설명 13px/1.6 muted, 패딩 `40px 0`, 가운데 정렬

## Interactions & Behavior
**로그인 · 홈 · 탭 내비게이션**
- 로그인: 메일 제출 → 매직 링크 발송 → "메일을 확인해주세요" 상태(재전송 60초 쿨다운). 링크 클릭으로 세션 생성 후 메인 진입. 신규 가입이면 메인 대신 가이드로 먼저 보냄.
- 홈: "명단 확인" → 해당 스테이지 명단(B). "전체 보기" → 각각 내 티켓 / 내 스테이지 탭. 헤더 도움말 → 가이드(Z8).
- 탭 전환은 화면 전환만 하고 스크롤 위치를 탭별로 기억합니다. 탭 4개는 항상 노출하며, 데이터가 없으면 Z6/Z7 빈 상태(문구 + 다음 행동 버튼)를 보여줍니다 — 탭을 비활성화하거나 숨기지 않습니다.
- 주최 이력이 생기면(첫 스테이지 생성) 홈이 Z3 → Z2 구성으로 바뀝니다. 별도 역할 전환 없음.
- 알림 센터/알림 배지는 이번 범위에 없습니다. 상태 변화 안내는 메일로만.
- 가이드: 스텝 카드는 정보 전달용(비인터랙티브), FAQ만 아코디언. "예매자에게 보이는 화면 보기"는 A1을 읽기 전용 미리보기로 띄움.
- 내 티켓: "QR 티켓 보기" → 전체화면 QR(A4와 동일 티켓 카드). "예약번호로 찾기" → 예약번호 + 연락처로 기존 예매를 계정에 연결.
- 내 스테이지: 카드 액션은 상태별로 다름 — open/ended는 "명단", draft는 "이어 쓰기".
- D-day·입금대기 건수는 서버 값 기준으로 계산해 표기하고, 0건이면 문구를 대체(빈 상태에 숫자 0을 노출하지 않음).

**예매 flow**
- 매수 −/+ : 1–4 범위, 총 결제금액 즉시 갱신(단가 × 매수), A2 요약·A3 금액에도 동일 값 반영. 경계값에서 버튼 비활성(`opacity-50`, pointer-events none).
- "예매자 이름과 동일합니다" 체크 시 입금자명을 예매자 이름으로 채움.
- "예매하기" → A2, "입금 안내 받기" → A3, "입금했어요" → 주최자 확인 대기 안내(상태는 여전히 입금대기), 주최자가 확인하면 A4.
- 기한 초과 시 예매 자동 취소(문구로 이미 고지).
- 마감·매진 시 CTA는 disabled + "예매가 마감되었습니다".

**명단 관리**
- 필터 칩: 상태별 필터, 전환 시 선택 초기화.
- 검색: 이름·예약번호·입금자명 부분일치, 입력마다 즉시 필터 + 선택 초기화.
- 정렬: "신청일시"(기본, 최신순 ↓ ↔ 오래된순 ↑), "예매자"(가나다 ↑ ↔ ↓). 한 번에 하나만 활성.
- 체크박스: 행 단위 토글(행 클릭과 분리, `stopPropagation`), 헤더 체크박스는 **현재 보이는 행** 전체 토글.
- 일괄 처리: 선택 건 입금 확인 / 취소 처리 → 상태 갱신 후 선택 해제. 확정 메일 발송은 별도 액션.
- 행 클릭 → 우측 상세 패널 갱신. 행 액션 "입금 확인"은 단건 확정.
- 입금 확인은 되돌릴 수 있어야 함(undo 또는 상태 재변경).
- 파괴적 액션(취소 처리, 마감하기)은 확인 다이얼로그 + 손실을 명시하는 문구.

**모션**: 오버레이만 100ms 페이드 + 95% 줌. 그 외는 150ms 색/그림자 트랜지션. 프레스는 1px 아래로 밀림(`active:translate-y-px`), 스케일·색 플래시 없음. 포커스는 3px teal 링(30%) + `--ring` 보더.

## State Management
예매 flow (관객): `qty`(1–4), `sameName`(bool), 예매자 폼 4필드, `step`(1–3), 서버 상태 `booking.status`(pending/confirmed/cancelled), `code`, `deadline`.

로그인·홈·탭: `email`, `authState`("idle"|"sent"|"error"), `resendCooldown`, `user{name}`, `activeTab`("home"|"tickets"|"stages"|"me"), `stages[]`(id, title, dateTime, venue, seatTotal, seatsTaken, pendingCount, status), `tickets[]`(id, stageTitle, dateTime, qty, status, code), 파생값 `upcomingStage`, `upcomingTicket`, `dday`, `isHost`(stages.length > 0 — 홈 구성만 결정하고 탭 노출에는 영향 없음).

명단 관리 (주최자): `bookings[]`(id, name, phone, code, qty, payer, email, createdAt, status, mismatch), `filter`("all"|"pending"|"confirmed"|"cancelled"), `query`, `sort{key:"date"|"name", dir:"asc"|"desc"}`, `selected: id[]`, `detailId`.
- 파생값: 건수/티켓수/확정좌석/입금액/필터·정렬 결과/전체선택 여부 — 모두 계산으로 얻고 별도 상태로 두지 않음.
- `mismatch`는 입금자명 ≠ 예매자명 비교 결과(서버 계산 권장).
- 데이터 페칭: 스테이지 상세 1건 + 명단 목록(정렬·필터는 건수가 커지면 서버 쿼리로), 상태 변경은 낙관적 업데이트 + 실패 시 롤백.

## Design Tokens
컬러는 **기존 시스템 토큰 그대로** 사용했으며 새 색을 만들지 않았습니다. 원본 정의는 이 폴더의 `tokens/colors.css`(+ `styles.css`가 나머지 토큰 파일을 `@import`)에 있습니다. 요약:
- 단일 색조 oklch hue 185(teal). `--background` `oklch(0.985 0.005 185)`, `--card` 0.995 half-step, `--primary` `oklch(0.55 0.12 185)` — **한 화면에 solid primary는 하나**.
- 상태·태그·위험은 전부 틴트: `primary/8`, `primary/10`, `input/50`, `secondary`, `destructive/10`. 순수 빨강은 쓰지 않음.
- 다크모드는 조상 `.dark` 클래스, 모든 토큰에 다크 값 존재. 보더는 white 12%.
- 타이포: Inter 단일(헤딩도 Inter — 크기·굵기로만 구분). 제목 20~26px/700, 카드 타이틀 16px/500, 본문 13~14px, 메타 12px muted. 숫자·코드(계좌번호·예약번호)만 Geist Mono. 입력은 모바일 16px / md 이상 14px (iOS 줌 방지).
- 간격: 4px 스케일. 카드 패딩·섹션 gap 24px, 폼 필드 사이 16px, 라벨→컨트롤 6px, 버튼 사이 8px.
- 반경: 셀렉트/텍스트영역 16px, 필드·배지·팝오버 22px, 버튼·카드·다이얼로그 26px, 아바타·상태 pill·탭 999px. 모바일 프레임 40px(프로토타입 표현용).
- 엘리베이션: `shadow-md`(카드) / `lg`(팝오버·메뉴) / `xl`(다이얼로그) **+ 1px `ring-foreground/5` 헤어라인**. 보더가 아니라 링. 필드는 반대로 rest에서 보더 없이 `--input` 50% 채움.
- 배경은 플랫 컬러만. 그라디언트·텍스처·일러스트 없음(앱 마크만 예외).

## Assets
- 새로 만든 이미지 없음. 아이콘은 전부 `lucide-react`: chevron-left / chevron-right / chevron-down, calendar, check, copy, 그리고 탭·헤더용 house, ticket, mic, circle-user, circle-help. 프로토타입은 lucide를 import할 수 없어 앞의 9개는 `Icon` 래퍼로, 나머지는 동일 path를 인라인 SVG(24 grid, 2px stroke, round cap)로 넣었습니다 — 프로덕션에서는 `lucide-react`를 직접 쓰세요.
- 워드마크는 아트가 아니라 타입(`Wordmark` 컴포넌트).
- 스테이지 포스터는 주최자 업로드 이미지 자리. 프로토타입은 드래그&드롭 플레이스홀더(`image-slot.js`)로 표현 — 프로덕션에서는 실제 업로드 이미지 + 빈 상태 처리.
- 명단 데이터(이름·연락처·예약번호·이메일)는 전부 가상의 예시입니다.

## Files
- `메인 로그인 가이드.dc.html` — 로그인 / 홈(주최 이력 있음·없음) / 내 티켓 / 내 스테이지 / 빈 상태 2종 / 가이드 = 8화면.
- `예매 플로우.dc.html` — 모바일 예매 4화면 (한 파일에 나란히 배치). 마크업은 파일 안 `<x-dc>` 블록, 상태 로직은 같은 파일의 `class Component`.
- `명단 관리.dc.html` — 데스크톱 명단 관리 화면 + 명단 상태 로직(필터/검색/정렬/선택/상태변경).
- `styles.css`, `tokens/` — 디자인 시스템 토큰 원본(컬러·타이포·반경·간격·엘리베이션 + 컴파일된 유틸리티).
- `image-slot.js` — 포스터 플레이스홀더 지원 스크립트(프로토타입 전용, 구현 불필요).

브라우저에서 두 `.dc.html`을 바로 열어 인터랙션(매수 스텝퍼, 필터, 정렬, 다중 선택, 상세 패널)을 확인할 수 있습니다.
