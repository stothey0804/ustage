# CLAUDE.md — qr-ticket 프로젝트 컨텍스트

## 프로젝트 개요

소규모 공연/강연을 위한 폐쇄형 예매 및 입장확인 시스템.
공연자가 예매 링크를 직접 공유하고, 참석자는 그 링크를 통해서만 예매·조회할 수 있다.
결제는 계좌이체 전용이며 이벤트 소유자가 수동으로 입금 확인 처리를 한다.

**통합 인증**: 역할 구분 없이 한 계정으로 이벤트 생성(공연자)과 예매(참석자) 모두 가능.
비회원도 예매할 수 있으며, 이메일+비밀번호로 예약을 조회한다.
로그인은 이메일+비밀번호와 카카오(Supabase OAuth) 두 가지 — 카카오는 이메일을 주지 않으므로
로그인 후 `/onboarding/email`에서 사용할 주소를 입력받는다.

---

## 기술 스택

| 역할            | 라이브러리              |
| --------------- | ----------------------- |
| 프레임워크      | Next.js 16 (App Router) |
| 언어            | TypeScript (strict)     |
| 스타일          | Tailwind CSS v4         |
| UI 컴포넌트     | shadcn/ui               |
| 백엔드/DB/Auth  | Supabase                |
| 서버 상태       | TanStack Query v5       |
| 클라이언트 상태 | Zustand                 |
| 폼              | react-hook-form + zod   |
| QR 생성         | react-qr-code           |
| QR 스캔         | html5-qrcode            |
| 리치텍스트 에디터| CKEditor 5              |
| 이미지 저장     | Supabase Storage        |
| 날짜            | date-fns                |
| 서체            | Pretendard Variable (자체 호스팅) |

---

## 디렉토리 구조

```
src/
├── app/
│   ├── page.tsx                        # 랜딩 (로그인/회원가입 버튼)
│   ├── login/page.tsx                  # 로그인 + "비회원 예약정보 조회" 링크
│   ├── signup/page.tsx                 # 회원가입
│   │
│   ├── onboarding/
│   │   └── email/page.tsx              # 카카오 계정 이메일 등록
│   │
│   ├── dashboard/                      # 로그인 전용 — proxy.ts로 보호
│   │   ├── layout.tsx                  # Header + 이메일 미인증 배너
│   │   ├── page.tsx                    # 홈 ("내 이벤트 관리" / "내 예약 조회" 선택)
│   │   ├── account/page.tsx            # 계정 설정 (이메일·로그인 수단 연결)
│   │   ├── events/
│   │   │   ├── page.tsx                # 내 이벤트 목록
│   │   │   ├── new/page.tsx            # 이벤트 생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # 이벤트 상세 + 예매 명단
│   │   │       ├── edit/page.tsx       # 이벤트 수정
│   │   │       └── scan/page.tsx       # QR 스캔 입장확인 (카메라)
│   │   └── bookings/
│   │       ├── page.tsx                # 내 예약 목록 (참석자 관점)
│   │       └── [id]/page.tsx           # 예약 상세 + QR 코드
│   │
│   ├── e/                              # 공개 — 로그인 불필요
│   │   └── [slug]/
│   │       ├── page.tsx                # 예매 폼 (로그인 시 user_id 연결)
│   │       └── me/page.tsx             # 비회원 예약 조회 (이메일+비밀번호)
│   │
│   ├── auth/callback/route.ts          # 이메일 확인 콜백
│   ├── actions/                        # Server Actions
│   └── api/                            # Route Handlers (service_role 필요한 작업)
│
├── components/
│   ├── auth/                           # 인증 관련 (LoginForm, SignupForm)
│   ├── dashboard/                      # 대시보드 컴포넌트 (Header, EventForm, BookingList 등)
│   ├── booking/                        # 예매 흐름 컴포넌트
│   └── ui/                             # shadcn 자동 생성 (직접 수정 허용)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts                   # 서버 컴포넌트용 (cookies 기반)
│   │   ├── admin.ts                    # service_role 전용 (bcrypt, QR 토큰 조회)
│   │   └── middleware.ts               # 세션 갱신 헬퍼 (proxy에서 호출)
│   ├── validations/                    # zod 스키마 모음
│   └── utils.ts                        # cn() 등 공통 유틸
│
├── hooks/                              # 커스텀 훅 (use로 시작)
├── store/                              # Zustand 스토어
├── types/
│   ├── database.ts                     # supabase gen types로 자동생성 — 직접 수정 금지
│   └── index.ts                        # 앱 레벨 공통 타입
└── proxy.ts                            # /dashboard/* 인증 가드 (Next 16)
```

---

## Supabase 설계

### 테이블 구조

**events**

```
id              uuid PK
performer_id    uuid → auth.users
title           text
description     text             # 리치텍스트 (HTML) — CKEditor로 입력
booking_notice  text nullable    # 신청 폼 상단 주의사항 (HTML) — CKEditor로 입력
cancel_policy   text nullable    # 취소·환불 규정 (HTML) — 신청 시 안내 + 취소 시 재확인
poster_url      text nullable    # 포스터 이미지 URL (Supabase Storage)
event_date      timestamptz
event_end_date  timestamptz nullable  # 종료 일시 (선택)
venue           text
venue_address   text nullable    # 카카오 주소검색 결과
venue_lat       float8 nullable
venue_lng       float8 nullable
price           integer          # 원 단위
bank_info       text             # "카카오뱅크 3333-123-456789 홍길동"
contact         text             # 오픈카톡 URL 또는 전화번호
custom_fields   jsonb            # [{id, label, type, required}]
slug            text UNIQUE      # 참석자 접근용 URL 식별자
booking_seq     integer          # 인원 번호 발급 카운터 (예매당 quantity만큼 증분, 재사용 없음)
status          text             # 'draft' | 'open' | 'closed' | 'ended'
capacity        integer nullable
booking_start   timestamptz      # 예매 시작일시
booking_end     timestamptz      # 예매 종료일시
created_at      timestamptz
```

**bookings**

```
id              uuid PK
event_id        uuid → events
booking_no      integer          # 이 예매의 **첫 인원 번호** (트리거가 quantity만큼 범위 예약, (event_id, booking_no) UNIQUE)
user_id         uuid nullable → auth.users  # 로그인 참석자 연결 (비회원은 NULL)
name            text
email           text             # 예매자 이메일 (확인 메일 발송, 비회원 조회 키, 중복 예매 방지)
password_hash   text             # bcrypt, 비회원 예매 시에만 사용 (회원 예매는 빈 문자열 "")
depositor_name  text             # 입금자명 (참석자 입력, 무료 이벤트는 name으로 자동 채움)
deposited_at    text             # 입금시간 (참석자 입력, 자유형식, 무료 이벤트는 "무료입장")
quantity        integer          # 예매 매수 (1~20)
status          text             # 'pending' | 'confirmed' | 'cancelled' (무료 이벤트는 즉시 confirmed)
custom_answers  jsonb            # {field_id: value}
created_at      timestamptz

# 레거시(미사용): checked_in, checked_in_at, qr_token, payment_confirmed(_at)
#   → QR/체크인은 booking_tickets로 이관됨. DB 정리 대상.
```

**event_draws** — 현장 추첨 기록 (회차별 당첨자 1행)

```
id              uuid PK
event_id        uuid → events (cascade)
booking_id      uuid nullable → bookings (on delete set null)
ticket_id       uuid nullable → booking_tickets (on delete set null)
attendee_no     integer          # 삭제 대비 스냅샷
booking_no      integer nullable # 레거시(예매 단위 추첨 시절) — 쓰지 않음
round           integer          # 이벤트 내 회차 (1부터)
created_at      timestamptz
```

**booking_tickets** — 예매 1건당 quantity개 생성, QR/입장은 티켓 단위

```
id              uuid PK
booking_id      uuid → bookings
ticket_number   integer          # 예매 안에서 1부터 quantity까지
attendee_no     integer          # 인원 번호 = booking_no + ticket_number - 1 (트리거 자동)
qr_token        uuid UNIQUE default gen_random_uuid()
checked_in      boolean
checked_in_at   timestamptz nullable
```

**event_staff** — 스테이지 공동 관리자(스태프)

```
id              uuid PK
event_id        uuid → events (on delete cascade)
invited_email   text             # 초대받은 이메일 (가입 여부는 조회하지 않음)
user_id         uuid nullable → auth.users  # 수락 시 그 세션의 계정으로 채워짐
invite_token    uuid UNIQUE default gen_random_uuid()
status          text             # 'pending' | 'accepted'
expires_at      timestamptz      # 기본 now() + 7일
invited_at      timestamptz
accepted_at     timestamptz nullable

# UNIQUE: invite_token, (event_id, lower(invited_email)), (event_id, user_id) where user_id not null
# RLS: SELECT만 — 소유자는 자기 스테이지 행, 스태프는 자기 행.
#      INSERT/UPDATE/DELETE 정책 없음 → 쓰기는 service_role(서버 액션)만.
```

### RLS 정책 원칙

- `events`: 소유자(performer_id)는 자신의 이벤트만 CUD, 모든 사람이 SELECT 가능 (slug 기반 접근)
- `bookings`: 소유자는 자기 이벤트의 예매만 조회/수정, 로그인 사용자는 자신의 예매(user_id) SELECT 가능, INSERT는 누구나 가능 (예매 제출)
- `bookings` / `booking_tickets` / `event_draws`의 호스트 정책은 소유자 대신
  `public.can_manage_event(event_id)` (security definer)를 쓴다 — 소유자 **또는**
  수락한 스태프. `event_staff`를 정책 안에서 직접 조회하면 재귀가 나므로 함수로 감쌌다.
  단 파괴적 동작(`events` CUD, `bookings` DELETE, `event_draws` DELETE)은 **소유자 전용 유지**.
- 감사용으로 `bookings.status_updated_by`, `booking_tickets.checked_in_by`에 처리한 계정을 남긴다.
- 비밀번호 검증과 QR 토큰 조회는 **service_role**을 쓰는 API Route에서만 처리
- 예매 생성은 `create_booking` RPC(이벤트 행 잠금 + 단일 트랜잭션)로 정원 초과를 방지하고,
  `(event_id, lower(email))` 부분 유니크 인덱스가 중복 예매를 차단 — `supabase/migrations/` 참고.
  RPC 미적용 환경에서는 API가 비원자 경로로 폴백하며 경고 로그를 남긴다.
- 공개 API(예매 제출, 비회원 조회)는 `hit_rate_limit` RPC 기반 rate limit 적용
  (`lib/rate-limit.ts`, fail-open). 비회원 조회는 IP당 분당 10회 + 계정당 15분 5회.

### 타입 재생성 명령어

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```

---

## URL 설계

| 경로                           | 접근   | 설명                                           |
| ------------------------------ | ------ | ---------------------------------------------- |
| `/`                            | 누구나 | **메인 = 로그인** (이메일+비밀번호 · 카카오) + FAQ. 로그인 상태면 `next`로 이동 |
| `/login`                       | 누구나 | `/`로 리다이렉트 (기존 링크·`?next=` 호환용)   |
| `/signup`                      | 누구나 | 회원가입                                       |
| `/onboarding/email`            | 로그인 | 카카오 계정 이메일 등록 (계정 이메일 없으면 강제 진입) |
| `/dashboard`                   | 로그인 | 홈 — "내 이벤트 관리" / "내 예약 조회" 선택    |
| `/dashboard/account`           | 로그인 | 계정 설정 — 이메일 상태, 로그인 수단(카카오) 연결·해제, 회원 탈퇴 |
| `/dashboard/events`            | 로그인 | 내 이벤트 목록 + "이벤트 추가하기"             |
| `/dashboard/events/new`        | 로그인 | 이벤트 생성                                    |
| `/dashboard/events/[id]`       | 로그인 | 이벤트 상세 + 예매 명단                        |
| `/dashboard/events/[id]/edit`  | 로그인 | 이벤트 수정                                    |
| `/dashboard/events/[id]/scan`  | 로그인 | QR 스캔 입장확인                               |
| `/dashboard/bookings`          | 로그인 | 내 예약 목록 (참석자 관점)                     |
| `/dashboard/bookings/[id]`     | 로그인 | 예약 상세 + QR 코드                            |
| `/e/[slug]`                    | 누구나 | 예매 폼 (로그인 시 user_id 연결, 비로그인 시 이메일+비밀번호) |
| `/e/[slug]/me`                 | 누구나 | 비회원 예약 조회 (이메일+비밀번호)             |

> `/e/[slug]`는 이벤트 소유자가 공유하는 링크. 메인에서 검색·발견 불가.

---

## 비즈니스 로직 규칙

### 이벤트 상태

```
draft  (오픈 전)   → 이벤트 작성 중, 예매 불가
open   (티켓 오픈) → 예매기간 내 + 좌석 여유 → 예매 가능
closed (티켓 마감) → 예매기간 종료 또는 수동 마감
ended  (행사 종료) → event_date 경과
```

- `draft` → `open`: 수동, 또는 booking_start 도래 시 자동. **예매 기간은 필수가 아니다.**
- `open` → `closed`: 수동 마감, 또는 booking_end 도래 시 자동.
- `open`/`closed` → `ended`: event_date 경과 시 자동.
- `closed` → `open`: 재오픈 가능 (좌석 여유 + 예매기간 내 — 서버 액션에서 검증).
- **예매 기간 미설정의 의미** (한쪽만 비우는 것도 허용):
  - `booking_end = null` = **자동 마감 없음**. 좌석 소진·행사 종료·수동 마감으로만 닫힌다.
    즉 실질 상한은 `event_date`가 아니라 `event_end_date ?? event_date`이며,
    그때까지는 스테이지 진행 중에도 예매를 받는다(현장 판매를 막지 않는다).
  - `booking_start = null` = **자동 오픈 없음**. 종료만 지정하면 draft에 방치될 수 있어
    폼에서 "직접 티켓 오픈하라"고 안내한다(검증으로 막지는 않는다).
  - 대신 `booking_start < (event_end_date ?? event_date)`는 zod로 막는다 — 시작 시각이
    오기 전에 ended가 되어 **영원히 열리지 못하는 설정**이기 때문.
  - 주최자 상세는 `booking_end`가 없으면 "미설정 — 직접 마감"으로 **표시**하고,
    공개 페이지는 그대로 **생략**한다(마감일 미정을 약속처럼 보이지 않게).
- 자동 전환은 `lib/auto-status.ts`의 lazy 방식: 이벤트 상세/공개 페이지 조회 시
  `autoTransitionStatus`(service_role로 DB 반영), 목록 등 표시 전용은 `deriveAutoStatus`.
  예매 API도 저장된 status가 아닌 파생 상태로 판정하므로 전환 누락이 있어도 예매는 차단됨.
- 좌석 소진 시 status는 바뀌지 않고, 예매 API가 신청 시점에 잔여석 검사로 거절.
  거절 응답은 `code: "capacity_exceeded"` + `remaining`(남은 좌석)을 함께 준다 —
  예매 폼·추가 구매 모달이 **닫지 않고 그 자리에서** 매수 상한을 낮춘다(동시 제출로
  좌석이 줄어드는 일이 잦다). `remaining: 0`이면 매진 문구를 띄우고 제출 버튼을 막는다.
- **좌석을 차지하는 기준은 "취소되지 않은 모든 예매"다(입금대기 포함).** 입금 확인은
  확정(QR 발급)만 좌우하고 좌석 선점과는 무관하다 — 좌석은 신청 시점에 잡힌다.
  세는 곳은 모두 `lib/seats.ts`(`occupiedSeats`/`confirmedSeats`/`remainingSeats`/
  `occupancyPercent`, vitest로 검증)를 쓴다. RPC(`create_booking`,
  `create_onsite_booking`)의 SQL 검사도 같은 기준이다.
  주최자 화면의 좌석 지표·progress도 **점유 기준**으로 표시하고 "확정 n · 대기 m"을
  병기한다 — confirmed만 세면 공개 페이지는 매진인데 주최자 화면에는 자리가 남은 것처럼
  보인다(2026-08-12 수정). 입금 기한이 없는 서비스이므로 대기가 좌석을 무기한 물 수 있고,
  그것을 주최자가 눈으로 보고 정리하는 것이 유일한 대비책이다.

### 예매(참석자) 상태

```
예매 제출
  → status: 'pending'     (입금대기 — 유료 이벤트 기본값)
  → status: 'confirmed'   (참석확정 — 소유자가 수동 처리, 무료 이벤트는 제출 즉시)
  → status: 'cancelled'   (취소 — 이벤트 소유자가 처리)
  → booking_tickets.checked_in: true  (QR 스캔으로 입장 — 티켓 단위)
```

### 취소·환불 규정과 참석자 셀프 취소

- `events.cancel_policy`(CKEditor HTML)를 스테이지 생성·수정에서 입력한다.
- 노출 지점: 공개 스테이지 페이지 · 예매 폼(제출 직전) · 예약 조회(비회원) ·
  예약 상세(회원) · 취소 확인 모달(참석자/주최자 양쪽) · 취소 완료 메일.
  표시는 항상 `sanitizeEventHtml`을 통과한 HTML만 사용하고, 클라이언트로 넘길 때는
  API 응답 단계에서 정화한다(`/api/bookings/lookup`의 `cancel_policy_html`).
- 참석자 셀프 취소: `POST /api/bookings/cancel` (service_role)
  - 본인 확인 — 회원은 세션 `user_id` 일치, 비회원은 이메일 + 비밀번호 bcrypt 대조
  - **차단 조건은 `lib/booking-cancel.ts`의 `selfCancelBlockReason` 한 곳에서만 정한다**
    (API·비회원 조회 화면·회원 예약 상세가 같은 함수를 쓴다. 순수 함수, vitest로 검증):
    - **입금이 확인된 유료 예약(`confirmed` + `price > 0`)** — 환불은 주최자가 계좌로
      직접 처리해야 하는데 참석자가 스스로 취소하면 명단에서 사라져 환불 대상을 놓친다.
      **취소는 주최자(스태프 포함)만 할 수 있다.**
      무료 스테이지는 제출 즉시 `confirmed`이고 환불할 것이 없으므로 셀프 취소를 허용한다.
    - 이미 취소됨 / 티켓 1장이라도 `checked_in` / 스테이지 종료(`event_end_date ?? event_date` 경과)
    - 막힌 경우 버튼만 감추지 않고 이유와 주최자 연락처를 화면에 안내한다
  - `status = <검사한 상태>` 조건부 갱신 — 중복 취소뿐 아니라 검사와 갱신 사이에
    주최자가 입금확인을 마친 경우도 걸러낸다
  - rate limit: IP 분당 10회 + 예약당 15분 5회
  - 취소 후 참석자에게 취소 완료 메일, 주최자에게 취소 알림 메일 발송
  - 좌석은 별도 처리 없이 반환됨 (잔여석 계산이 `status != 'cancelled'` 합산이므로)

### 부분(티켓 단위) 취소 — 1차: 주최자·스태프 전용

2매 이상 예매에서 **일부 티켓만** 취소한다(3매 중 1매 취소). 마이그레이션
`supabase/migrations/20260812100000_partial_cancel.sql`을 **코드 배포 전에** 적용한다.

- 모델: `booking_tickets.cancelled_at`/`cancelled_by` + `bookings.cancelled_quantity`.
  **아무것도 지우지 않는다** — 티켓 행 삭제·booking_id 이동·`quantity` 감소는
  `attendee_no = booking_no + ticket_number - 1` 계산식, `(booking_id, ticket_number)` UNIQUE,
  트리거의 범위 검증, `event_draws.ticket_id`를 한꺼번에 깨뜨린다.
- `bookings.quantity`는 **구매 이력값으로 불변**. 유효 매수 = `quantity - cancelled_quantity`.
  예매번호 범위 표기(`#2–4`)는 구매 매수 기준을 유지하고, 취소는 별도로 표시한다.
- `cancelled_quantity`는 코드가 아니라 **트리거**(`booking_tickets_sync_cancelled`)가 계산한다.
  좌석 합산의 SQL 단일 출처는 `event_booked_seats(event_id)`, TS 단일 출처는 `lib/seats.ts`
  (`effectiveQuantity`/`occupiedSeats`). 한 곳이라도 빠지면 오버부킹이 난다.
- 취소는 `cancel_booking_tickets` RPC(service_role 전용)로만 한다 — 예매 행 `FOR UPDATE` 잠금 +
  `cancelled_at is null and checked_in = false` 조건부 갱신(동시 QR 스캔과 대칭 차단) +
  **전량 취소 시 예매를 cancelled로 승격**(승격을 빼먹으면 중복 이메일 검사가 재예매를 영구 차단).
- **입장 처리된 티켓은 부분 취소할 수 없다**(주최자도) — "당첨 티켓 = 입장 티켓" 불변식이
  깨진다. 되돌릴 일은 예매 전체 취소로 처리한다.
- 취소된 티켓: QR 스캔·강제 입장 거부, 확정 메일 재발송에서 제외, 추첨 후보 제외,
  참석자 화면에서 "취소된 티켓"으로 표시, CSV는 `취소매수` 컬럼과 유효 매수로 기록.
  참석자에게는 부분 취소 메일(취소 인원 번호 · 남은 매수 · 환불 대상 금액)이 나간다.
- **참석자 셀프 부분 취소는 도입하지 않았다(2차 보류).** 문의를 받아 주최자가 처리한다.
- 취소 판정은 항상 OR: 예매 `status='cancelled'` **또는** 티켓 `cancelled_at` 존재.
  기존 전체 취소 예매의 티켓에 `cancelled_at`을 백필하지 않는다(감사 기록 오염 방지).

### 입금 확인 처리

- 이벤트 소유자만 가능 (`/dashboard/events/[id]`)
- pending ↔ confirmed 전환 가능 (실수 대응)
- pending/confirmed → cancelled 전환 가능
- `status: 'pending'` 상태에서는 QR 스캔 시 입장 처리 불가 (경고 표시)

### QR 두 종류 (혼동 주의)

- **입장 QR** — `booking_tickets.qr_token`(티켓 1장당 1개). 참석자에게 발급, 스캔하면 입장 처리.
- **예매 페이지 QR** — 공개 링크(`/e/[slug]`)를 인코딩한 홍보용 QR.
  `components/dashboard/EventQrShare.tsx`에서 클릭 시 `qrcode`를 동적 import해 PNG를
  생성하고 저장(download)·공유(Web Share, 이미지 첨부 가능하면 파일까지)를 제공한다.
  개인정보가 없어 포스터·SNS에 그대로 써도 된다.

### QR 토큰

- QR 코드에는 `booking_tickets.qr_token` (UUID)만 인코딩 — 개인정보 노출 없음, 티켓 1장당 1개
- 스캔 시 서버에서 토큰으로 티켓·예약 조회 → 이름, 입금상태, 입장여부 표시
- 이미 입장 처리된 경우 "재입장 시도" 경고 표시 (checked_in=false 조건부 갱신으로 동시 스캔 방지)
- **입장 처리에 시각 제약을 두지 않는다.** 행사 시작 전(사전 입장·리허설)에도, 종료 후에도
  스캔·강제 입장이 가능하다. 게이트는 권한(`can_manage_event`/`check_in`)과
  예매 상태(`confirmed`만 허용, pending·cancelled는 거절) 둘뿐이다 —
  `api/check-in/route.ts`·`forceCheckIn`·스캔 페이지 어디에도 `event_date` 비교를 넣지 말 것.

### 카카오 로그인 (Supabase OAuth)

**Supabase / 카카오 콘솔 설정** (코드로 처리 불가 — 대시보드에서 직접):

1. 카카오 개발자센터 → 애플리케이션 생성 → 카카오 로그인 활성화
   - Redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - 동의항목: **닉네임 · 프로필 사진 · 카카오계정(이메일) 세 개를 모두 켜야 한다.**
     gotrue가 `account_email,profile_image,profile_nickname`을 항상 scope에 붙이고
     (`lib/kakao.ts`의 `KAKAO_SCOPES`는 그 뒤에 덧붙을 뿐 대체하지 못한다 — 인가 URL로 확인),
     설정되지 않은 항목이 섞이면 카카오가 "설정하지 않은 카카오 로그인 동의 항목"으로 거절한다.
   - `account_email`은 **비즈 앱 전환**이 전제다. 이메일을 '선택 동의'로 두면 사용자가
     거부할 수 있고, 그때는 이메일이 비어 오므로 `/onboarding/email` 흐름이 대비책이 된다.
   - 동의항목 없이(수집 0) 가려면 Supabase provider를 우회해 카카오 OIDC + `signInWithIdToken`을
     직접 구현해야 한다 — 구현본은 커밋 `0f16ddb`, 되돌린 커밋은 `8f9a5d1`.
2. Supabase → Authentication → Providers → Kakao 활성화, REST API 키(Client ID)와
   Client Secret(보안 → Client Secret) 입력
3. Supabase → Authentication → URL Configuration → Redirect URLs에
   `http://localhost:3000/auth/callback`, `https://<도메인>/auth/callback` 추가
4. Supabase → Authentication → Advanced → **Manual linking 활성화**
   (기존 이메일 계정에 카카오를 연결하는 `/dashboard/account` 기능이 이 설정을 요구)

- **계정의 기준은 이메일이다. 카카오 로그인만으로는 계정이 생기지 않는다.**
  `/auth/callback`이 `identities`에 `email`이 없으면(= 이메일 가입을 거치지 않은 계정)
  그 계정을 삭제하고 `/signup?email=<카카오 주소>&from=kakao`로 보낸다. 판정은
  `lib/oauth-account.ts`의 `decideOAuthAccount`(순수 함수, vitest로 검증).
  - 계정을 남겨두면 그 이메일로 가입이 막혀(이미 사용 중) 가입 자체가 불가능해진다.
  - **스테이지·예매·스태프 데이터가 있는 계정은 삭제하지 않고 통과시킨다**(기존 사용자
    보호). 데이터 조회가 실패하면 "있다"로 간주한다.
  - 가입 화면은 카카오 주소를 **자동완성**한다.
  - **인증이 끝나면 처음 시도했던 카카오를 자동으로 연결한다.** 가입 확인 메일의
    `emailRedirectTo`가 `/onboarding/link-kakao?next=…`를 가리키고, 그 화면이
    `linkIdentity({provider:'kakao'})`를 바로 시작한다(카카오 동의 화면을 한 번
    거쳐야 하므로 서버에서 대신할 수 없다). 실패하면 수동 버튼과 '나중에 하기'를
    제공하고, 이미 연결된 상태로 들어오면 목적지로 통과시킨다.
    → 이 단계를 거치면 identity가 `[email, kakao]`가 되어 **연결 해제도 가능**해진다.
    이 화면을 빼면 "가입은 됐는데 카카오 버튼으로는 못 들어오는" 상태로 끝난다.
  - 카카오가 이메일을 주지 않은 경우도 같은 경로로 보내되 자동완성은 비운다.
  - 같은 이메일로 이미 가입돼 있어 카카오 연결이 거절되면(gotrue 오류) "이메일로
    로그인한 뒤 계정 설정에서 연결하라"는 문구로 바꿔 보여준다.
- 로그인 화면(`/`)과 회원가입 화면(`/signup`)은 **같은 `KakaoLoginButton`** 을 쓴다 —
  scopes·redirectTo·콜백이 동일하고 label만 다르다("카카오로 계속하기"/"카카오로 시작하기").
  `?next=`도 양쪽 모두 이어받는다(회원가입에서 버려지던 것을 고쳤다 — 이메일 가입의
  확인 메일 `emailRedirectTo`에도 next가 붙는다).

**앱 흐름**:

```
[카카오로 로그인] → signInWithOAuth({provider:'kakao'})
  → /auth/callback (code → 세션 교환)
  → 계정 이메일 없음(needsEmailSetup) → /onboarding/email
      → updateUser({ email, data:{ contact_email } }) : 인증 메일 발송
      → 인증 전에도 contact_email로 앱 동작 (대시보드 상단 미인증 배너 노출)
  → 계정 이메일 있음 → next 경로
```

- 이메일 해석은 항상 `lib/account-email.ts`의 `getAccountEmail`(계정 이메일 → 없으면
  `user_metadata.contact_email`)을 사용한다. `user_metadata`는 사용자가 수정할 수 있어
  **신뢰 경계가 아니다** — 소유 증명이 필요한 로그인·비밀번호 재설정은 계정 이메일만 인정.
- `/dashboard/*`는 이메일 **등록**까지만 강제(proxy에서 `/onboarding/email`로 리다이렉트).
  인증 완료는 강제하지 않는다.
- **회원은 이메일을 변경할 수 없다(정책).** 계정 설정에는 '이메일 등록'만 있고,
  `/onboarding/email`은 `user.email`이 있으면 되돌려보낸다 — 즉 최초 등록 전용이다.
  카카오가 이메일을 주는 계정은 온보딩도 건너뛰므로 가입 주소를 그대로 쓴다.
  바꿔야 하는 예외 상황은 Supabase 대시보드에서 관리자가 처리한다(그때는 Secure
  email change 때문에 기존·새 주소 양쪽 확인이 필요하다).
  → 계정 설정은 `user.new_email`이 남아 있으면 '변경 대기 중'을 계속 표시한다
  (과거 요청이 미완료로 남은 경우를 감추지 않기 위해).
- 기존 이메일 계정과 병합: 온보딩에서 이미 가입된 주소를 입력하면 안내를 띄우고,
  그 계정으로 로그인한 뒤 `/dashboard/account`에서 `linkIdentity({provider:'kakao'})`로 연결한다.
  (카카오가 이메일을 주지 않아 Supabase 자동 연결은 동작하지 않는다.)
- **카카오만 연결된 계정은 카카오를 해제할 수 없다.** GoTrue가 마지막 identity 삭제를
  거부하고(`single_identity_not_deletable`), 이메일을 등록하거나 비밀번호를 정해도
  **email identity는 생기지 않는다**(Supabase 미지원 — 카카오 로그인 계정은
  `identities = [kakao]` 하나로 유지된다). 그래서 UI는 버튼을 숨기지 않고
  "유일한 로그인 수단이라 해제할 수 없어요"와 우회 방법(이메일+비밀번호로 가입한
  계정에 카카오를 연결)을 함께 안내한다. `auth.identities`에 직접 행을 넣는 우회는 쓰지 않는다.
- **연결 해제는 카카오만 가능하다.** 이메일 identity는 해제 버튼을 노출하지 않고
  `unlink()` 함수에서도 막는다 — 예매 안내·비밀번호 재설정·스태프 초대가 모두 그 주소를
  기준으로 하므로 끊으면 계정을 되찾을 수 없다. 주소 변경은 '이메일 변경'으로만 한다.
  카카오도 다른 수단이 남아 있을 때만 해제할 수 있다(마지막 수단 해제 방지).

### 회원 탈퇴 (`deleteAccount` 서버 액션)

`/dashboard/account` 최하단. "탈퇴"를 직접 입력해야 실행되며 되돌릴 수 없다.

- **차단 조건**: 내가 만든 스테이지에 예매 이력(취소분 포함)이 하나라도 있으면 탈퇴 불가.
  주최자가 사라지면 입금 확인·입장 처리를 할 사람이 없어지므로 먼저 정리하게 안내한다.
- 예매가 없는 내 스테이지는 함께 삭제하고 포스터 파일도 지운다(실패는 무시).
- 참석자로서의 예약은 **삭제하지 않고 `user_id`만 NULL로 끊는다** — 주최자 명단·정산
  기록 보존이 우선이다. cascade 삭제 설정이 있어도 미리 끊어두면 기록이 남는다.
  대신 회원 예약은 `password_hash`가 빈 값이라 탈퇴 후 본인 조회는 불가능하다.
- 계정 삭제는 service_role(`admin.auth.admin.deleteUser`)로 처리하고, 이후 세션 쿠키를
  정리한 뒤 `/`로 보낸다.

### 비밀번호 재설정

- `requestPasswordReset` 서버 액션만 재설정 메일을 보낸다(클라이언트에서 직접
  `resetPasswordForEmail`을 호출하지 않는다).
- **가입된 계정 이메일에만 보낸다.** Supabase 기본 동작은 미가입 주소에도 성공을
  돌려줘 "보냈다"고 안내하게 되는데 실제로는 메일이 오지 않아 사용자가 스팸함만
  뒤진다. `account_email_exists` RPC(service_role 전용, security definer)로 먼저
  확인하고 없으면 그 사실을 알린다.
- 계정 열거 위험은 rate limit으로 낮춘다 — IP 10분 10회 + 주소당 15분 5회.
- `user_metadata.contact_email`은 인정하지 않는다(신뢰 경계가 아니므로).
  카카오 미인증 주소로는 재설정할 수 없고, 계정 설정에서 이메일 인증을 마쳐야 한다.
- 마이그레이션 `20260801100000_account_email_exists.sql` 미적용 환경에서는
  확인을 건너뛰고 발송한다(fail-open — 예전 동작으로 되돌아갈 뿐이다).

### 참석자 인증 (이중 경로)

**로그인 참석자**:
- 예매 시 user_id가 booking에 연결됨
- `/dashboard/bookings`에서 자신의 전체 예약 목록 확인 가능
- 비밀번호 입력 불필요

**비회원 참석자**:
- 예매 시 이메일 + 비밀번호(4자 이상) 입력 → password_hash로 저장
- `/e/[slug]/me`에서 이메일+비밀번호로 본인 예약 조회
- 비밀번호는 서버에서 bcrypt 비교 (클라이언트에 hash 노출 금지)
- 비밀번호 분실 시 자가 복구 없음 — 이벤트 소유자가 대시보드에서 초기화

### 추가 구매

- 같은 이벤트에 동일 이메일 신규 예매 감지 시 예매 폼에서 확인 모달
  ("이미 예매한 내역이 있습니다. 추가 예약을 하시겠어요?") → 확인하면 additional로 재제출
- 본인 확인은 서버에서 필수: 비회원 = 기존 예약과 같은 비밀번호(bcrypt 대조),
  회원 = 세션 user_id의 기존 예약 존재. 불일치 시 403.
- 조회 화면(비회원 `/e/[slug]/me`, 회원 예약 상세)에도 별도 '추가 구매' 버튼 존재
- 추가 구매는 별도 예약으로 생성. `create_booking(p_allow_duplicate=true)`로 처리하고
  비밀번호 해시는 항상 기존 예약에서 상속한다(같은 비밀번호로 함께 조회되도록).
- **이름·커스텀 답변은 "이번에 보낸 값"이 이긴다** — 판정은 `lib/booking-inherit.ts`의
  `resolveBookingIdentity`(순수 함수, vitest로 검증). 경로가 둘이기 때문이다:
  - 예매 폼에서 중복 이메일이 감지돼 추가 구매로 재제출 → 사용자가 이름·답변을 채워
    보내므로 **그 값을 저장한다.** 동반자 대리 예매처럼 예약마다 다른 것이 정상이다.
    (예전에는 무조건 상속해 사용자가 고친 값이 조용히 버려졌다 — 2026-08-20 수정)
  - 예약 조회 화면의 '추가 구매' → 매수·입금 정보만 받고 이름·답변 UI가 없다.
    보낼 값이 없으니 기존 예약에서 상속한다.
  - 커스텀 필드 **필수 검사는 답변을 보낸 경우에만** 적용한다(상속 경로는 원본이 이미
    검사를 통과했다).
- 비회원 조회는 비밀번호가 일치하는 모든 예약을 반환 (추가 구매분 포함)

### 이메일 발송 (Resend)

- 신청완료 메일: 유료 = 입금 안내(계좌·금액), 무료 = 즉시 확정이므로 입장 QR 포함
- 입금확인(pending→confirmed) 시: 입장 QR 포함 확정 메일 **자동 발송**(`sendBookingConfirmed`).
  명단의 '확정 메일 재발송' 버튼은 재발송 전용(`resendBookingConfirmation`)이며 이미
  confirmed인 예매에만 동작한다. 상태가 실제로 바뀐 건에만 보내므로 중복 발송은 없고,
  액션이 `updated`/`mailed` 건수를 돌려줘 토스트 문구가 실제 발송과 어긋나지 않는다.
  발송은 `after()`라 응답 뒤에 일어나고 실패는 로그만 남는다(화면에는 성공으로 보인다).
- 참석자 셀프 취소 시: 참석자에게 취소 완료 메일(`sendBookingCancelled`, 취소 규정·연락처 포함),
  주최자에게 취소 알림(`sendOwnerCancelNotice`) — 주최자 주소는 `getAccountEmail`로 해석
- 주최자 취소(pending/confirmed → cancelled) 시: 참석자에게 취소 통보 메일
  (`sendBookingCancelled({ byOwner: true })` — 제목·문구가 "주최자가 취소" 버전으로 바뀜).
  이미 cancelled였던 예약은 재발송하지 않는다.
- Supabase Auth 메일(가입 인증·비밀번호 재설정·이메일 변경 확인) 템플릿은 `supabase/templates/`에
  보관하고 Supabase 대시보드 Email Templates에 붙여 쓴다. 파일 첫 줄 주석에 대응 슬롯이 적혀 있다.
- **메일 링크는 `{{ .ConfirmationURL }}`을 쓰지 않는다.** 그 링크는 PKCE `?code=`로 돌아오고,
  교환에는 링크를 요청한 브라우저에 저장된 code verifier 쿠키가 필요하다. 그래서 PC에서
  가입하고 **네이버·카카오 메일 앱의 인앱 브라우저**로 링크를 열면 쿠키가 없어 "만료"로
  실패한다(2026-08-11 실제 신고). 템플릿은
  `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=<signup|recovery|email_change>`
  형태로 보내고, `/auth/callback`이 `verifyOtp`로 서버에서 검증한다 — 어느 기기·브라우저에서
  열어도 된다. `{{ .RedirectTo }}`는 앱이 넘긴 `emailRedirectTo`라 개발·운영 도메인이 그대로
  반영된다. 뒤에 `&`로 붙이므로 **모든 호출부의 `emailRedirectTo`는 쿼리스트링(`?next=…`)을
  포함해야 한다** — LoginForm/SignupForm 테스트가 이 불변식을 지킨다.
  목적지 판정은 `lib/auth-link.ts`의 `resolveSafeNext`(순수 함수, vitest로 검증)가 한다.
- **가입 인증(`type=signup`)은 `/auth/verified` 안내 화면을 한 번 거친다.** 링크를 메일 앱의
  인앱브라우저에서 열면 세션이 그 브라우저에만 생기는데, 바로 대시보드로 보내면 원래(PC)
  브라우저로 돌아간 사용자가 인증된 줄 모르고 다시 가입해 "이미 가입된 이메일입니다"를 본다
  (2026-08-11 실제 신고). 안내 화면은 세션이 있으면 [계속하기](next 유지), 없으면
  [로그인하기]를 준다. 회원가입 대기 화면에도 "인증은 링크를 연 브라우저에서 완료된다"는
  안내와 로그인 링크를 둔다.
  → **`recovery`·`email_change`는 이 화면을 거치지 않는다** — 비밀번호 재설정은 곧바로
  `/reset-password`로 가야 한다. 분기 키는 반드시 `type`이다.
  → signup 검증 경로는 정의상 이메일 가입 계정이므로 **카카오 전용 계정 정리
  (`decideOAuthAccount`)를 태우지 않는다.** 태우면 `identities`가 비어 오는 경우
  정상 가입 계정을 삭제할 수 있다(현재 GoTrue는 identities를 함께 주지만 의존하지 않는다).
  → 템플릿 파일을 고쳤으면 **Supabase 대시보드 Email Templates에 다시 붙여야** 적용된다.
  실패 문구는 `describeAuthLinkError`가 한국어로 바꿔 `/`(로그인)의 `?error=`로 보여준다.
  남은 한계: 메일 보안 스캐너가 링크를 먼저 열면 토큰이 소비돼 사람이 누를 때 만료로 보인다
  (해결하려면 클릭이 필요한 중간 확인 페이지가 필요 — 아직 도입 안 함).
- QR은 CID 인라인 첨부 (Gmail이 data: URI 이미지를 차단하므로)
- 발신자: `RESEND_FROM_EMAIL` 환경변수 (검증된 도메인 주소여야 함)
- **kakao.com(=Daum 인프라) 수신 실패 대응.** 지메일·네이버는 받는데 kakao.com만
  안 오는 증상은 대개 인증 정렬(SPF/DKIM/DMARC)과 발신 도메인 평판 문제다.
  2026-07-30 확인: `privateustage.com`에 **DMARC 레코드가 없고**, 루트 도메인 SPF도
  없다(`send.privateustage.com`에만 `include:amazonses.com`, DKIM은 `resend._domainkey` 존재).
  1) `_dmarc.privateustage.com` TXT에 `v=DMARC1; p=none; rua=mailto:…` 추가
  2) 루트 도메인에 SPF(`v=spf1 include:amazonses.com ~all`) 추가 — From 도메인 정렬
  3) **Supabase Auth 메일은 Resend가 아니라 Supabase 기본 SMTP로 나간다.**
     가입 인증·비밀번호 재설정이 kakao.com에 안 닿으면 Auth → SMTP Settings에
     Resend를 커스텀 SMTP로 연결해 우리 도메인·평판으로 보내야 한다.
  4) Daum/카카오 발신 도메인 등록(화이트리스트) 신청 + Resend 로그에서 kakao.com
     반송(bounce/blocked) 사유 확인.

### 예매번호 = 인원(티켓) 번호

- 번호는 **사람 1명(티켓 1장)당 하나**다. 1번째 예매자 1매 → `#1`,
  2번째 예매자 2매 → `#2`, `#3`, 3번째 예매자 1매 → `#4`.
- **범위 예약 방식**: `bookings_assign_no` 트리거가 `events.booking_seq`를 quantity만큼
  증분해 예매에 연속 번호 범위를 예약하고 `bookings.booking_no`에 **첫 번호**를 넣는다.
  각 티켓은 `booking_tickets_assign_attendee_no` 트리거가
  `attendee_no = booking_no + ticket_number - 1`로 채운다.
  → 번호가 행 순서가 아니라 계산으로 정해지므로 예매 생성 3경로
  (`create_booking` / `create_onsite_booking` / API 비원자 폴백)가 **코드 수정 없이** 정확하다.
- 스테이지별 유일성은 (a) `events` 행 잠금으로 범위가 겹치지 않고
  (b) `(booking_id, ticket_number)` UNIQUE + 트리거의 범위 검증으로 범위 안이 겹치지 않아
  `booking_tickets`에 `event_id`를 비정규화하지 않고 보장된다.
- 삭제해도 번호를 재사용하지 않고, 취소된 예매도 번호를 유지한다.
- 표시(`lib/booking-code.ts`):
  - `formatBookingNoRange(no, quantity, id)` → `#2` / `#2–3` (예매 단위 화면)
  - `formatBookingNo(no, id)` → `#2` (단일 번호), 둘 다 번호가 없으면 `BK-XXXXXX` 폴백
  - `matchesBookingNoRange`는 범위 안 **어느 번호로도** 검색되게 한다.
    숫자 질의는 번호만 대조한다(uuid 코드에 숫자가 섞여 오탐이 나므로).
- 노출: 명단 목록·상세·CSV는 범위(`#2–3`), 티켓별 입장 목록·QR 티켓·QR 스캔 결과·
  확정 메일 QR 라벨은 **인원 번호 하나**(`#3`). 내 티켓/예약 상세는 상태 배지 하단 primary.
- **QR 티켓과 확정 메일에서는 입장번호를 크게 쓴다**(화면 `text-4xl`, 메일 40px + "입장번호"
  라벨). 현장 호명·추첨의 기준이라 QR보다 먼저 읽혀야 하고, 참석자가 캡처해 두게
  "입장번호는 현장 추첨에 쓰일 수 있어요 — 번호와 함께 캡처해 주세요." 안내를 함께 둔다.

### 현장 추첨 (`/dashboard/events/[id]` 추첨 탭)

- 대상은 **입장 완료된 티켓**이다(취소 예매 제외). 티켓 1장 = 사람 1명 = 응모 1건이라
  2매 중 1매만 입장했으면 입장한 그 1장만 후보가 된다.
- 추첨 단위는 **티켓(사람)**. 같은 예매의 티켓 두 장이 각각 당첨될 수 있고, 이름·이메일은
  예매자 것뿐이라 화면에서는 **번호로 구분**한다(동반자 이름을 받지 않는다).
- '이전 당첨자 제외'도 **티켓 단위** — 같은 예매의 아직 안 뽑힌 동반자는 후보로 남는다.
- 여러 번 추첨하며 회차(`round`)가 쌓인다. **이전 당첨자 제외** 체크박스가 기본 on.
  기록은 `event_draws`에 저장해 새로고침·재접속에도 유지되고, 현장 분쟁의 근거가 된다.
  `attendee_no`를 스냅샷으로 남겨 티켓·예매가 삭제돼도 회차 기록은 보존된다.
  `(event_id, round, ticket_id)` 부분 UNIQUE로 같은 회차 중복 저장을 막는다.
- 추첨은 서버에서 `node:crypto`의 `randomInt`로 수행한다(클라이언트 난수 금지).
  순수 로직은 `lib/lottery.ts`, 마스킹은 `lib/mask.ts` — 둘 다 vitest로 검증한다.
- 결과 표기: 인원 번호 + 이름 마스킹(`김*영`) + 이메일 앞 4자만(`seyo***@ustage.im`).
  로컬파트가 4자 이하면 첫 글자만 남긴다(전체 노출 방지).
- 추첨하면 **모달**이 열려 실제 후보 번호가 굴러가고(최소 1.6초), 당첨 번호를 크게 띄운다.
  모달에서 '한 번 더 추첨'으로 회차를 이어갈 수 있다.

### 현장 예매 (`createOnsiteBooking`)

- 주최자가 명단 툴바 "현장 예매 추가"에서 비회원 예매를 대신 만든다.
- **스테이지 상태를 검사하지 않는다** — 행사 당일(closed/ended)에 쓰는 기능이라
  `create_booking`(open 필수) 대신 `create_onsite_booking` RPC를 쓴다.
  좌석 정원과 중복 이메일은 그대로 막는다(중복은 재확인 후 추가 예매로 허용).
- **잔여석을 초과할 수 없다** — 다이얼로그가 남은 좌석을 매수 상한으로 쓰고(정원이 없으면
  20매), 매진이면 등록 버튼을 막는다. RPC도 같은 검사를 하므로 이중 방어다.
- **커스텀 필드를 함께 받는다.** 예전에는 이 폼에 필드가 아예 없어 현장 예매만 답변이 빈
  채로 남았고(예매 수정 UI가 없어 영구히), 필수 항목도 비어 있었다. 필수 검사는 서버 액션이
  공개 예매(`api/bookings`)와 같은 규칙으로 한다.
  → 마이그레이션 `20260820100000_onsite_custom_answers.sql`을 **코드 배포 전에** 적용한다
  (`create_onsite_booking`이 `custom_answers`를 null로 하드코딩하고 있었다).
- 조회 비밀번호는 **4자리 숫자를 자동 생성**해 평문을 응답에 한 번만 실어 준다.
  주최자가 현장에서 알려주는 용도이며, 이후에는 명단의 비밀번호 초기화로만 재발급한다.
- `confirmNow`(유료 기본 on, 무료는 항상 확정)면 즉시 confirmed + 입장 QR 확정 메일,
  아니면 pending + 입금 안내 메일. `depositor_name = 이름`, `deposited_at = "현장 예매"`.

### 스테이지 스태프 (공동 관리자)

한 스테이지를 **소유자 + 스태프(최대 10명)** 가 함께 운영한다.
역할은 2종이며 권한 판정은 **`lib/staff-permissions.ts`의 매트릭스 한 곳**에만 있다.

| 동작 | 소유자 | 스태프 |
| --- | --- | --- |
| 명단 열람 · CSV 내보내기 | ✅ | ✅ |
| QR 입장 처리 / 강제 입장 | ✅ | ✅ |
| 입금 확인 · 예매 취소 · 확정 메일 재발송 | ✅ | ✅ |
| 조회 비밀번호 초기화 · 현장 예매 · 추첨 실행 | ✅ | ✅ |
| 예매 삭제 · 추첨 기록 초기화 | ✅ | ❌ |
| 스테이지 수정·삭제·상태 전환, 스태프 관리 | ✅ | ❌ |

- CSV는 명단 열람과 기술적으로 분리되지 않으므로(이미 로드된 목록으로 만든다)
  열람을 허용하면 함께 허용한다 — 막아도 실질 보호가 아니다.
- 모든 서버 액션·API는 `lib/event-access.ts`의 `assertEventAccess(eventId, capability)` /
  `assertBookingAccess(bookingId, capability)`를 단일 관문으로 지난다. RLS는 같은 경계를
  DB에서 한 번 더 막는 이중 방어이고, **동작 단위 허용은 매트릭스가 결정한다.**
- UI도 같은 함수로 감춘다: 스테이지 상세는 스태프에게 수정/삭제/상태 전환/스태프 탭을
  숨기고 헤더에 "스태프" 배지를 띄운다. 명단 상세는 `visibleBookingActions(role)`로
  삭제 버튼을, 추첨 탭은 `canReset`으로 기록 초기화를 가린다.
  `/dashboard/events` 목록에는 스태프로 참여한 스테이지도 함께 나오고 카드에 배지가 붙는다.

**초대 흐름** (`app/actions/staff.ts`, `components/dashboard/StaffPanel.tsx`)

1. 소유자가 이메일을 입력 → `event_staff` 행 생성(pending) + 초대 링크 메일(`sendStaffInvite`).
   **가입된 회원에게만 초대할 수 있다** (2026-08-20 정책 변경 — `account_email_exists` RPC로
   확인). RPC 호출이 실패하면 **초대를 보내지 않는다(fail-closed)** — 통과시키면 규칙이
   조용히 무력화되므로, 마이그레이션 `20260801100000`이 반드시 적용돼 있어야 한다. 오타 주소로 초대가 새는 것을 막고, 명단(개인정보) 접근
   위임의 수신자를 계정으로 특정한다. 존재 여부가 소유자에게 드러나는 계정 열거는
   감수한다 — 로그인 사용자 + 계정당 시간당 10회 제한이 대량 조회를 막는다.
2. 수신자가 `/dashboard/staff/accept/[token]`을 열면 `/dashboard` 하위이므로 proxy가
   로그인(및 카카오 이메일 등록)을 먼저 강제하고, 그 다음 수락된다.
3. 수락은 **링크를 누른 그 세션의 `auth.uid()`** 를 연결한다. 카카오 계정은
   `auth.users.email`이 없고 `user_metadata.contact_email`은 신뢰 경계가 아니어서
   이메일 매칭으로 계정을 특정하지 않는다. 초대받은 주소와 다른 계정으로 수락해도
   허용되며(가족 계정 등), 링크 소지 자체가 인증이다.
4. 만료 7일, 중복 수락은 `status='pending'` 조건부 갱신으로 차단.
   경계 판정은 순수 함수 `validateInviteAcceptance`가 담당(자기 스테이지·만료·중복).
   **같은 계정의 재방문은 오류가 아니라 성공(멱등)** — 수락 후 재로그인해 메일 링크로
   다시 들어오는 흐름에서 "이미 스태프입니다" 오류 화면이 뜨던 것을 고쳤다.
5. 재초대는 토큰·만료를 새로 발급(재발송과 동일). 제외는 소유자가 즉시 가능하고,
   스태프도 `leaveEventStaff`로 스스로 나올 수 있다.

> 마이그레이션 `supabase/migrations/20260731100000_event_staff.sql`은
> **코드 배포 전에** 적용해야 한다(새 코드가 `event_staff`와 감사 컬럼을 조회한다).

### 앱 진입부 내비게이션 (Z2~Z7 반영)

- 계정은 하나이고 주최자·참석자를 겸하므로 **역할 전환 UI를 두지 않는다.**
- 모바일: `components/dashboard/BottomTabBar.tsx` — 홈 / 내 티켓 / 내 스테이지 /
  마이페이지 **4개 고정**. 주최 이력이 없어도 숨기지 않고 빈 상태로 안내한다.
  데스크톱(sm 이상)은 `Header`의 탭 네비게이션을 쓰고 탭바는 숨는다.
- 홈(`/dashboard`)은 목록이 아니라 **요약**: 인사 한 줄(D-day·입금대기 건수) +
  다가오는 내 티켓 1건 + 가장 가까운 내 스테이지(좌석 progress · 입금대기 · [명단 확인]).
  주최 이력이 없으면 스테이지 생성 유도 카드로 바뀐다(`isHost = events.length > 0`).
- 참석자 티켓 목록의 명칭은 **내 티켓**으로 통일(과거 '내 예약').
  다가오는 확정 티켓 1장을 큰 카드로, 나머지는 예매 확정 / 입금 확인 중 / 지난 티켓 섹션.
- 매직 링크 로그인(Z1)은 도입하지 않았다 — 이메일+비밀번호와 카카오를 유지한다.
  가이드(Z8) 개편도 범위 밖(`/guide`는 기존 구조 유지).

### 명단 관리 (주최자, 데스크톱 최적화)

`components/dashboard/BookingTable.tsx` — 스테이지 상세의 기본 탭.
`design_handoff_ustage_booking/명단 관리.dc.html` 핸드오프를 따른다.
**모바일 대응은 범위 밖**(요구사항) — 좁은 화면에서는 테이블이 가로 스크롤된다.

- 요약 지표 4개: 총 예매 / 입금완료(금액) / 입금대기(가장 오래된 건 경과일) / 좌석(progress)
- 상태 필터 칩(건수 포함) + 이름·예약번호·입금자명·이메일 검색 + 밀도 토글 + 명단 내보내기
- 테이블: 체크박스 다중 선택 → 일괄 입금확인 / 확정 메일 발송 / 취소 처리.
  입금대기 행은 틴트로 강조하고, 입금자명이 예매자명과 다르면 '불일치' 칩.
- 우측 360px 상세 패널: 예약 정보 · 커스텀 답변 · 진행 타임라인 · 티켓별 입장 처리 ·
  확정 메일 재발송 · 취소 · 비밀번호 초기화 · 삭제
- **커스텀 필드는 컬럼으로 붙는다** — `events.custom_fields` 순서대로 입금자명과 신청일시
  사이에 삽입하고, 개수 제한·표시 토글은 두지 않는다(명단은 가로 스크롤 전제).
  컬럼 폭은 타입별로 정하고 `gridTemplateColumns`와 테이블 `minWidth`를 함께 계산한다.
  값 표기는 `lib/custom-answers.ts`의 `formatCustomAnswer` 하나만 쓴다(테이블 셀·상세 패널·CSV
  공용) — 예매 폼이 체크박스를 `"true"/"false"` **문자열**로 저장하기 때문에 화면마다 판별하면
  "true"가 그대로 노출된다(실제 있던 버그). 미응답은 테이블 `—`, CSV 빈 값.
  검색은 체크박스를 뺀 답변까지 대조한다("true"로 전원이 걸리는 오탐 방지).
  필드별 필터 UI는 두지 않는다 — 상태 칩 + 자유 검색으로 충분하다.
- 예약번호는 `lib/booking-code.ts`의 `bookingCode(id)`로 uuid에서 파생한 **표시 전용** 값이다.
  조회·인증 키로 쓰지 않는다.
- 대시보드 레이아웃은 폭을 제한하지 않고(`max-w-[1520px]`) 각 페이지가 자기 max-width를 정한다.

### 예매 흐름 (참석자 관점)

3단계로 끝낸다 (`design_handoff_ustage_booking/예매 플로우.dc.html` 반영).

```
1단계 — /e/[slug] 상세 하단 (BookingForm idle)
  포스터 · 안내(description) · 일시/장소/가격 · 잔여좌석 progress
  └ 매수 스텝퍼(−/+, 1~잔여석) + 총 결제금액 + [예매하기 / 비회원 예매]
     ↳ 매수를 고르는 별도 화면을 두지 않는다

2단계 — 예매자 정보 (다이얼로그, 3분할 진행 인디케이터)
  요약 카드(스테이지·일시·**매수 스텝퍼**·총액) → 예매 주의사항(booking_notice)
  기본 필드: 이름, 이메일, (비회원) 비밀번호, 입금자명, 입금 예상 시간
    · "예매자 이름과 동일합니다" 기본 체크 → 입금자명 자동 입력
  커스텀 필드 → 취소·환불 규정 → [입금 안내 받기]

3단계 — 입금 안내
  금액 블록(입금대기 배지 · 총액 · 매수 · 예약번호) → 계좌 카드(복사)
  → 확인 사항(입금자명 불일치 지연 · 확인 후 QR 확정 메일)
  무료 스테이지는 즉시 확정 안내 + QR 메일 발송으로 대체
```

### 공개 예매 페이지 폭

- `/e/[slug]` 본문 폭은 **포스터 기준 너비(`POSTER_WIDTH` = 600px)** 에 맞춘다.
  화면이 그보다 넓으면 그 폭으로 고정하고, 좁으면 모바일처럼 100%로 흐른다
  (`max-w-[calc(600px+2rem)]` — px-4 여백을 포함한 값).
- 포스터도 같은 값을 `next/image`의 width로 쓴다. 두 값이 갈라지지 않게
  상수와 클래스를 같은 파일 위·아래에 붙여 둔다(Tailwind는 정적 클래스만 읽는다).

### 핸드오프 대비 의도적 차이 (재논의 대상 아님)

`design_handoff_ustage_booking/`의 목업 중 아래는 **일부러 구현하지 않았다.**
목업에 있다는 이유로 다시 추가하지 말 것.

- **참석자 연락처(전화번호) 필드 없음.** 필수 항목이 아니며 `bookings`에 컬럼도 두지 않는다.
  명단 테이블·상세 패널에서 목업의 연락처 자리에는 **이메일**을 표시한다.
- **문자(SMS) 발송 없음.** 상태 변화·공연 변경 안내는 **이메일로만** 보낸다.
  목업의 "공연 변경 안내를 문자로 보내드려요" 헬프텍스트와 상세 패널의 "문자 보내기"
  버튼은 제외했다. 참석자가 주최자에게 연락할 때는 `events.contact`를 안내한다.
- **입금 기한이라는 개념이 없다.** 서비스에 기한을 정해 두지 않으므로 목업의 기한 배너·
  남은 시간 카운트다운·기한 초과 자동취소는 모두 제외했다. 입금 확인은 주최자가 명단에서
  수동으로 처리하고, 참석자 안내 문구에도 기한을 쓰지 않는다.
  (기한을 도입하려면 `events`에 기한 컬럼 + 만료 처리 배치가 먼저 필요하다.)
- 주최자 메모(상세 패널 Textarea): 컬럼이 없어 미구현.
- 앱 진입부(하단 탭 4개 IA, 매직 링크 로그인, 홈 요약 화면): 현재 상단 헤더 +
  이메일·카카오 로그인 구조를 유지한다. IA 개편은 별도 결정 사항.

### 스테이지 작성·수정 폼 (`components/dashboard/EventForm.tsx`)

- **포스터 파일 정리 규칙** (고아 파일 방지). 경로 파싱은 `lib/poster.ts`의
  `posterStoragePath` 한 곳만 쓴다(버킷 밖·경로 탈출은 null).
  - **저장 전에 올린 파일**은 클라이언트가 지운다 — 교체하면 이전 파일을, 삭제 버튼을
    누르면 그 파일을, 저장 없이 화면을 떠나면(언마운트) 남은 파일 전부를 지운다.
  - **이미 저장된 포스터**는 클라이언트가 절대 지우지 않는다. `updateEvent`가 저장을
    끝낸 뒤 예전 URL을 지운다(수정을 취소했을 때 살아 있는 스테이지의 포스터가
    사라지는 것을 막기 위함). 스테이지 삭제 시에는 `deleteEvent`가 지운다.
  - 삭제 실패는 무시한다(고아 파일만 남는 쪽이 안전).
- **임시저장(초안)은 브라우저 localStorage에만 둔다** — `hooks/useFormDraft` +
  `lib/form-draft.ts`(키·버전·30일 만료 판정은 순수 함수, vitest로 검증).
  **생성 모드에서만** 동작하고(수정 모드는 DB가 원본이라 옛 초안 복구가 남의 수정을 되돌린다),
  `poster_url`은 저장하지 않는다(저장 없이 떠나면 파일을 지우므로 복구해도 죽은 URL).
  진입 시 초안이 있으면 복구 배너, 제출 성공 시 삭제. 키에 userId를 넣어 공용 브라우저에서
  다른 계정 초안이 보이지 않게 한다.
  → **서버(DB) 초안은 만들지 않는다.** `events`의 NOT NULL(제목·일시·장소·가격·계좌·연락처·slug)이
  "오픈된 스테이지에는 필수값이 있다"를 담보하고 있고(오픈 액션은 필수값을 재검사하지 않는다),
  부분 데이터를 events 행으로 만들면 slug가 즉시 발급돼 `/e/<slug>`가 열리고 `booking_start`
  도래 시 자동 오픈까지 된다 — 미완성 스테이지가 공개되는 경로다.
  필수 4개(제목·시작일시·장소·연락처)를 채워 저장하면 `draft` 상태가 곧 임시저장이다.
- **작성 중 이탈 경고**: `hooks/useUnsavedWarning`이 `isDirty`일 때 beforeunload를 건다.
  DateTimePicker·에디터처럼 `setValue`로만 쓰는 필드는 `shouldDirty: true`가 필요하다 —
  빼면 경고가 조용히 죽는다. 앱 내부 이동은 beforeunload가 못 잡으므로 '취소' 버튼이
  직접 확인창을 띄운다(헤더·탭바 링크 이동은 아직 미보호).
- **리치텍스트는 `RichTextField`로 감싸 쓴다.** CKEditor 청크 로드·초기화가 실패하면
  (배포 직후 옛 청크 요청, 오프라인, 사내망 차단) 에디터 하나 때문에 작성 화면 전체가
  에러 경계로 날아간다. 경계가 이를 잡아 같은 값에 연결된 textarea로 대체하고 이유를
  안내한다. `RichTextEditor`를 화면에서 직접 import하지 말 것.

### 커스텀 폼 필드

- 기본 필드 (수정 불가): 이름, 비밀번호, 입금자명, 입금시간
- 공연자가 추가 가능한 타입: `text` | `number` | `select` | `checkbox`
- 각 필드에 `required` 여부 설정 가능

---

## 코딩 컨벤션

### 일반

- TypeScript strict 모드 — `any` 사용 금지, 불가피할 경우 주석 명시
- 컴포넌트 파일명: PascalCase (`BookingForm.tsx`)
- 훅/유틸 파일명: camelCase (`useBooking.ts`)
- 상수는 `UPPER_SNAKE_CASE`

### Next.js App Router

- 데이터 패칭은 Server Component에서 우선 처리
- 클라이언트 상태가 필요한 경우에만 `'use client'` 추가
- Server Action은 `app/actions/` 디렉토리에 분리
- `loading.tsx` / `error.tsx`는 각 라우트에 반드시 작성

### Supabase

- 브라우저 컴포넌트: `lib/supabase/client.ts`의 클라이언트 사용
- 서버 컴포넌트 / Route Handler: `lib/supabase/server.ts`의 클라이언트 사용
- service_role 키는 서버 사이드에서만 — 클라이언트 번들에 절대 포함 금지
- DB 조회 결과는 항상 `database.ts`의 자동생성 타입 사용

### 폼

- 모든 폼은 `react-hook-form` + `zod` resolver 사용
- zod 스키마는 `lib/validations/`에 분리 보관
- 에러 메시지는 한국어로 작성
- **zod는 `@/lib/zod`에서만 가져온다** — 그 모듈이 한국어 로케일(`z.config(ko())`)을
  깔아두므로, message를 적지 않은 검증도 기본 문구가 한국어로 나온다.
  `from "zod"`를 직접 쓰면 설정이 안 걸린 인스턴스가 섞여 영문 문구가 노출된다.
  기본 문구는 개발자 말투에 가까우니 **사용자에게 보일 검증에는 message를 직접 적는다.**
- 커스텀 필드 답변(`custom_answers`)은 **값이 `undefined`인 키를 허용**한다.
  select·checkbox는 Controller가 등록만 하고 손대기 전까지 값이 없어서, 스키마에서
  막으면 zod 기본 문구가 필드 아래 뜬다. 필수 검사는 `CustomFieldRenderer`의 RHF 룰
  (필드 이름이 들어간 한국어 문구)과 `api/bookings`의 서버 검사가 담당한다.

### 날짜·시간

- 표시는 항상 `lib/date.ts`의 `formatKST` — `@date-fns/tz`의 `TZDate`로 `Asia/Seoul`
  벽시계를 계산하므로 **실행 환경 타임존과 무관**하다. `+9시간`을 손으로 더하는 코드를
  다시 쓰지 말 것(UTC 머신에서만 맞고 KST 로컬에서는 9시간 밀렸던 원인).
- 저장은 반대 방향: `datetime-local` 입력값에 `+09:00`을 붙여 timestamptz로 넣는다
  (`app/actions/event.ts`의 `toKST`).
- 테스트는 `TZ`를 고정하지 않는다 — `date.test.ts`가 여러 타임존에서 같은 결과를 검증한다.

### 에러 처리

- Supabase 쿼리는 항상 `{ data, error }` 구조분해 후 error 체크
- 사용자에게 노출되는 에러 메시지는 한국어
- 개발용 상세 에러는 `console.error`로만 처리

---

## 서체 (Pretendard)

- 본문·제목 모두 **Pretendard Variable** 하나로 쓴다. 라틴 글자도 Pretendard가
  Inter 기반이라 따로 섞지 않는다(과거 Inter + 시스템 한글 폴백 조합을 대체).
- **CDN에 의존하지 않는다.** `public/fonts/pretendard/`에 woff2 92개(동적 서브셋,
  합계 3MB)를 담고 `src/app/pretendard.css`가 `unicode-range`로 나눠 선언한다.
  브라우저는 화면에 실제로 쓰인 범위만 내려받아 한 페이지당 보통 200KB 안쪽이다.
  → 파일을 갱신할 때는 `pretendard@<버전>`의
  `dist/web/variable/{woff2-dynamic-subset,pretendardvariable-dynamic-subset.css}`를
  받아 `url(./woff2-dynamic-subset/` → `url(/fonts/pretendard/`로만 바꿔 넣는다.
- 스택은 `globals.css`의 `:root { --font-sans }` 한 곳에서 정한다.
  `layout.tsx`의 next/font는 `--font-mono`(Geist Mono)만 남았다.
- 라이선스는 SIL OFL 1.1 — `src/app/pretendard.css` 상단 주석에 원본 고지를 유지한다.

## 공유 미리보기 (OG 이미지)

- **브랜드 마크 벡터의 단일 출처는 `lib/brand-mark.ts`** — 인앱 `BrandMark` 컴포넌트와
  루트 OG 이미지가 같은 문자열을 쓴다. `public/icon.svg`(파비콘·앱 아이콘)는 정적 파일이라
  import할 수 없는 쌍둥이이므로, 마크를 고치면 **두 곳을 함께** 고친다.
- 루트 `app/opengraph-image.tsx`는 브랜드 마크 + **us.tage 워드마크**를 그린다.
  가운뎃점은 글꼴 마침표가 아니라 원 요소다(화면의 `Wordmark`와 같은 모양).
  Satori 주의점 둘: JSX로 넣은 SVG는 gradient/defs가 깨져 **data URI `<img>`** 로 넘겨야 하고,
  **Fragment는 flex 자식으로 배치되지 않아** 형제 div로 나눠야 한다.
  한글은 폰트 데이터를 직접 넘겨야 렌더링되므로 Noto Sans KR 서브셋을 fetch한다.
- **공개 예매 페이지는 포스터를 미리보기로 쓴다** — `app/e/[slug]/opengraph-image.tsx`.
  ⚠️ **파일 기반 메타데이터가 `generateMetadata`보다 우선한다**(Next 공식 규칙). 그래서
  루트 `opengraph-image.tsx`가 있는 한 페이지에서 `openGraph.images`로 포스터를 지정해도
  무시된다 — 반드시 **그 세그먼트에 파일을 둬야** 한다. 페이지의 `generateMetadata`는
  제목·설명만 정하고(`lib/og-share.ts`), 이미지는 손대지 않는다.
  - 포스터는 세로가 길어 1200×630을 채울 수 없으므로 브랜드 배경 위에 전체를 담고
    (`objectFit: contain`) 옆에 제목·일시·장소·워드마크를 둔다. 카드 레이아웃은
    `lib/og-card.tsx`로 분리해 실제 예매 데이터 없이도 모양을 확인할 수 있다.
  - 포스터는 **미리 fetch해 data URI로** 넘긴다. 원격 URL을 그대로 주면 그 요청이 실패할 때
    렌더 전체가 터져 OG 이미지가 아예 없는 상태가 된다 — 실패 시 브랜드 마크로 대체한다.
  - `robots: noindex`는 유지한다 — 비공개 링크라 검색에 걸리지 않아야 하고, 메신저
    크롤러는 그 값과 무관하게 OG를 읽는다.

## 클로드 디자인(Design System) 동기화

- 대상 프로젝트: **ustage Design System** (`ee7714ae-032d-448f-b6e4-e3d2ab1f93e5`).
  `design_handoff_ustage_booking/*.dc.html`이 이 프로젝트의 토큰·번들 경로
  (`_ds/ustage-design-system-ee7714ae…/`)를 참조하므로 **경로 구조를 바꾸지 않는다.**
- 동기화 surface는 `.design-sync/entry.tsx` — `src/components/ui/*` + BrandMark ·
  Wordmark · StatusBadge · RichTextView. `auth/ booking/ dashboard/`의 앱 기능
  컴포넌트는 서버 액션·Supabase 클라이언트를 임포트해 브라우저 번들에 들어갈 수 없으므로
  **의도적으로 제외**한다. 즉 화면 조립을 고쳐도 DS 쪽에 올릴 것은 없다.
- 원격은 손으로 정리된 레이아웃(`components/{brand,core,display,forms,icons}/<Name>.jsx`)이고
  로컬 `ds-bundle/`(`.ds-sync/package-build.mjs` 산출물)은 자동 레이아웃이다.
  **통째로 덮어쓰지 말고** 실제로 바뀐 컴포넌트 파일만 증분 업로드한다.
- 컬러·반경·타이포 토큰의 원본은 `src/app/globals.css`이며 원격 `tokens/colors.css`와
  값이 일치한다(2026-07-29 확인). 토큰을 고치면 그때 원격 tokens만 갱신한다.

## 환경변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 전용, NEXT_PUBLIC 붙이지 말 것
```

---

## 주요 의사결정 기록

| 결정                          | 이유                                                    |
| ----------------------------- | ------------------------------------------------------- |
| 통합 인증 + 비회원 예매 병행  | 로그인하면 대시보드에서 이벤트/예약 관리, 비회원은 이메일+비밀번호로 예매·조회 |
| QR에 UUID만 인코딩            | 개인정보 보호, 토큰 무효화 가능                         |
| 계좌이체 전용                 | 카드 PG 연동 불필요, 공연자가 직접 확인                 |
| slug 기반 참석자 URL          | 공연 ID 노출 없이 공유 가능, 메인에서 검색 불가         |
| App Router 서버 컴포넌트 우선 | 예매 폼 외 대부분 읽기 전용, SEO 불필요하지만 성능 이점 |
| Supabase RLS                  | 공연자별 데이터 격리를 DB 레벨에서 보장                 |
| 스태프 권한을 매트릭스 1곳에  | 액션·API·UI가 같은 함수를 쓰므로 규칙이 갈라지지 않음    |
| 초대는 이메일+토큰 수락       | 가입 회원만 초대 가능(오타 유출 방지), 수락은 링크를 누른 세션 계정 기준 |
| 카카오 로그인 후 이메일 직접 입력 | 카카오가 비즈앱 심사 전에는 이메일 미제공 — 예매 메일·QR 발송에 주소가 필수 |
| 이메일 인증 전에도 진입 허용   | 카카오 간편함 유지. 미인증은 배너로 안내하고, 로그인·비밀번호 재설정만 제한 |
| 셀프 취소는 API(service_role)  | 참석자 UPDATE 권한을 RLS로 열지 않고 본인 확인·상태 검증을 서버에 모음 |

@AGENTS.md
