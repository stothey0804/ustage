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
user_id         uuid nullable → auth.users  # 로그인 참석자 연결 (비회원은 NULL)
name            text
email           text             # 예매자 이메일 (확인 메일 발송, 비회원 조회 키, 중복 예매 방지)
password_hash   text             # bcrypt, 비회원 예매 시에만 사용 (회원 예매는 빈 문자열 "")
depositor_name  text             # 입금자명 (참석자 입력, 무료 이벤트는 name으로 자동 채움)
deposited_at    text             # 입금시간 (참석자 입력, 자유형식, 무료 이벤트는 "무료입장")
quantity        integer          # 예매 매수 (1~10)
status          text             # 'pending' | 'confirmed' | 'cancelled' (무료 이벤트는 즉시 confirmed)
custom_answers  jsonb            # {field_id: value}
created_at      timestamptz

# 레거시(미사용): checked_in, checked_in_at, qr_token, payment_confirmed(_at)
#   → QR/체크인은 booking_tickets로 이관됨. DB 정리 대상.
```

**booking_tickets** — 예매 1건당 quantity개 생성, QR/입장은 티켓 단위

```
id              uuid PK
booking_id      uuid → bookings
ticket_number   integer          # 1부터 quantity까지
qr_token        uuid UNIQUE default gen_random_uuid()
checked_in      boolean
checked_in_at   timestamptz nullable
```

### RLS 정책 원칙

- `events`: 소유자(performer_id)는 자신의 이벤트만 CUD, 모든 사람이 SELECT 가능 (slug 기반 접근)
- `bookings`: 소유자는 자기 이벤트의 예매만 조회/수정, 로그인 사용자는 자신의 예매(user_id) SELECT 가능, INSERT는 누구나 가능 (예매 제출)
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
| `/`                            | 누구나 | 랜딩 — 로그인/회원가입 버튼                    |
| `/login`                       | 누구나 | 로그인 + "비회원 예약정보 조회" 링크           |
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

- `draft` → `open`: 수동. booking_start/end 설정 필요 (서버 액션에서도 검증).
- `open` → `closed`: 수동 마감, 또는 booking_end 도래 시 자동.
- `open`/`closed` → `ended`: event_date 경과 시 자동.
- `closed` → `open`: 재오픈 가능 (좌석 여유 + 예매기간 내 — 서버 액션에서 검증).
- 자동 전환은 `lib/auto-status.ts`의 lazy 방식: 이벤트 상세/공개 페이지 조회 시
  `autoTransitionStatus`(service_role로 DB 반영), 목록 등 표시 전용은 `deriveAutoStatus`.
  예매 API도 저장된 status가 아닌 파생 상태로 판정하므로 전환 누락이 있어도 예매는 차단됨.
- 좌석 소진 시 status는 바뀌지 않고, 예매 API가 신청 시점에 잔여석 검사로 거절.

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
  - 차단 조건 — 이미 취소됨 / 티켓 1장이라도 `checked_in` / 스테이지 종료(`event_end_date ?? event_date` 경과)
    → 이 경우는 주최자 문의로 안내
  - `status != 'cancelled'` 조건부 갱신으로 동시 요청 중복 취소 방지
  - rate limit: IP 분당 10회 + 예약당 15분 5회
  - 취소 후 참석자에게 취소 완료 메일, 주최자에게 취소 알림 메일 발송
  - 좌석은 별도 처리 없이 반환됨 (잔여석 계산이 `status != 'cancelled'` 합산이므로)

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
- 기존 이메일 계정과 병합: 온보딩에서 이미 가입된 주소를 입력하면 안내를 띄우고,
  그 계정으로 로그인한 뒤 `/dashboard/account`에서 `linkIdentity({provider:'kakao'})`로 연결한다.
  (카카오가 이메일을 주지 않아 Supabase 자동 연결은 동작하지 않는다.)

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
- 추가 구매는 별도 예약으로 생성 (이름·커스텀 답변·비밀번호 해시는 기존 예약에서 상속,
  입금자명·입금예상시간은 새로 입력). `create_booking(p_allow_duplicate=true)`로 처리.
- 비회원 조회는 비밀번호가 일치하는 모든 예약을 반환 (추가 구매분 포함)

### 이메일 발송 (Resend)

- 신청완료 메일: 유료 = 입금 안내(계좌·금액), 무료 = 즉시 확정이므로 입장 QR 포함
- 입금확인(pending→confirmed) 시: 입장 QR 포함 확정 메일 발송 (`sendBookingConfirmed`)
- 참석자 셀프 취소 시: 참석자에게 취소 완료 메일(`sendBookingCancelled`, 취소 규정·연락처 포함),
  주최자에게 취소 알림(`sendOwnerCancelNotice`) — 주최자 주소는 `getAccountEmail`로 해석
- 주최자 취소(pending/confirmed → cancelled) 시: 참석자에게 취소 통보 메일
  (`sendBookingCancelled({ byOwner: true })` — 제목·문구가 "주최자가 취소" 버전으로 바뀜).
  이미 cancelled였던 예약은 재발송하지 않는다.
- Supabase Auth 메일(가입 인증·비밀번호 재설정·이메일 변경 확인) 템플릿은 `supabase/templates/`에
  보관하고 Supabase 대시보드 Email Templates에 붙여 쓴다. 파일 첫 줄 주석에 대응 슬롯이 적혀 있다.
- QR은 CID 인라인 첨부 (Gmail이 data: URI 이미지를 차단하므로)
- 발신자: `RESEND_FROM_EMAIL` 환경변수 (검증된 도메인 주소여야 함)

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
  요약 카드(스테이지·일시·매수·총액) → 예매 주의사항(booking_notice)
  기본 필드: 이름, 이메일, (비회원) 비밀번호, 입금자명, 입금 예상 시간
    · "예매자 이름과 동일합니다" 기본 체크 → 입금자명 자동 입력
  커스텀 필드 → 취소·환불 규정 → [입금 안내 받기]

3단계 — 입금 안내
  금액 블록(입금대기 배지 · 총액 · 매수 · 예약번호) → 계좌 카드(복사)
  → 확인 사항(입금자명 불일치 지연 · 확인 후 QR 확정 메일)
  무료 스테이지는 즉시 확정 안내 + QR 메일 발송으로 대체
```

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
- 본문 서체 Pretendard 교체: CDN 의존이 생겨 보류(토큰은 Inter 유지).

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

### 에러 처리

- Supabase 쿼리는 항상 `{ data, error }` 구조분해 후 error 체크
- 사용자에게 노출되는 에러 메시지는 한국어
- 개발용 상세 에러는 `console.error`로만 처리

---

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
| 카카오 로그인 후 이메일 직접 입력 | 카카오가 비즈앱 심사 전에는 이메일 미제공 — 예매 메일·QR 발송에 주소가 필수 |
| 이메일 인증 전에도 진입 허용   | 카카오 간편함 유지. 미인증은 배너로 안내하고, 로그인·비밀번호 재설정만 제한 |
| 셀프 취소는 API(service_role)  | 참석자 UPDATE 권한을 RLS로 열지 않고 본인 확인·상태 검증을 서버에 모음 |

@AGENTS.md
