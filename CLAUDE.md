# CLAUDE.md — qr-ticket 프로젝트 컨텍스트

## 프로젝트 개요

소규모 공연/강연을 위한 폐쇄형 예매 및 입장확인 시스템.
공연자가 예매 링크를 직접 공유하고, 참석자는 그 링크를 통해서만 예매·조회할 수 있다.
결제는 계좌이체 전용이며 이벤트 소유자가 수동으로 입금 확인 처리를 한다.

**통합 인증**: 역할 구분 없이 한 계정으로 이벤트 생성(공연자)과 예매(참석자) 모두 가능.
비회원도 예매할 수 있으며, 이름+비밀번호로 예약을 조회한다.

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
│   ├── dashboard/                      # 로그인 전용 — proxy.ts로 보호
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # 홈 ("내 이벤트 관리" / "내 예약 조회" 선택)
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
│   │       └── me/page.tsx             # 비회원 예약 조회 (이름+비밀번호)
│   │
│   ├── auth/callback/route.ts          # 이메일 확인 콜백
│   ├── actions/                        # Server Actions
│   └── api/                            # Route Handlers (service_role 필요한 작업)
│
├── components/
│   ├── auth/                           # 인증 관련 (LoginForm, SignupForm)
│   ├── dashboard/                      # 대시보드 컴포넌트 (Header, EventForm, BookingList 등)
│   ├── booking/                        # 예매 흐름 컴포넌트
│   └── ui/                             # shadcn 자동 생성 (직접 수정 금지)
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
poster_url      text nullable    # 포스터 이미지 URL (Supabase Storage)
event_date      timestamptz
venue           text
price           integer          # 원 단위
bank_info       text             # "카카오뱅크 3333-123-456789 홍길동"
contact         text             # 오픈카톡 URL 또는 전화번호
custom_fields   jsonb            # [{id, label, type, required}]
slug            text UNIQUE      # 참석자 접근용 URL 식별자
status          text             # 'draft' | 'open' | 'closed'
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
password_hash   text nullable    # bcrypt, 비회원 예매 시에만 사용
depositor_name  text             # 입금자명 (참석자 입력)
deposited_at    text             # 입금시간 (참석자 입력, 자유형식)
status          text             # 'pending' | 'confirmed' | 'cancelled'
checked_in      boolean
checked_in_at   timestamptz nullable
qr_token        uuid UNIQUE default gen_random_uuid()
custom_answers  jsonb            # {field_id: value}
created_at      timestamptz
```

### RLS 정책 원칙

- `events`: 소유자(performer_id)는 자신의 이벤트만 CUD, 모든 사람이 SELECT 가능 (slug 기반 접근)
- `bookings`: 소유자는 자기 이벤트의 예매만 조회/수정, 로그인 사용자는 자신의 예매(user_id) SELECT 가능, INSERT는 누구나 가능 (예매 제출)
- 비밀번호 검증과 QR 토큰 조회는 **service_role**을 쓰는 API Route에서만 처리

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
| `/dashboard`                   | 로그인 | 홈 — "내 이벤트 관리" / "내 예약 조회" 선택    |
| `/dashboard/events`            | 로그인 | 내 이벤트 목록 + "이벤트 추가하기"             |
| `/dashboard/events/new`        | 로그인 | 이벤트 생성                                    |
| `/dashboard/events/[id]`       | 로그인 | 이벤트 상세 + 예매 명단                        |
| `/dashboard/events/[id]/edit`  | 로그인 | 이벤트 수정                                    |
| `/dashboard/events/[id]/scan`  | 로그인 | QR 스캔 입장확인                               |
| `/dashboard/bookings`          | 로그인 | 내 예약 목록 (참석자 관점)                     |
| `/dashboard/bookings/[id]`     | 로그인 | 예약 상세 + QR 코드                            |
| `/e/[slug]`                    | 누구나 | 예매 폼 (로그인 시 user_id 연결, 비로그인 시 이름+비밀번호) |
| `/e/[slug]/me`                 | 누구나 | 비회원 예약 조회 (이름+비밀번호)               |

> `/e/[slug]`는 이벤트 소유자가 공유하는 링크. 메인에서 검색·발견 불가.

---

## 비즈니스 로직 규칙

### 이벤트 상태

```
draft  (오픈 전)   → 이벤트 작성 중, 예매 불가
open   (티켓 오픈) → 예매기간 내 + 좌석 여유 → 예매 가능
closed (티켓 마감) → 예매기간 종료 또는 좌석 소진 또는 수동 마감
```

- `draft` → `open`: 수동. booking_start/end 설정 필요.
- `open` → `closed`: 수동 마감, 또는 booking_end 도래, 또는 예매 수 >= capacity 시 자동.
- `closed` → `open`: 재오픈 가능 (좌석 여유 + 예매기간 내).

### 예매(참석자) 상태

```
예매 제출
  → status: 'pending'     (입금대기 — 기본값)
  → status: 'confirmed'   (참석확정 — 이벤트 소유자가 수동 처리)
  → status: 'cancelled'   (취소 — 이벤트 소유자가 처리)
  → checked_in: true      (QR 스캔으로 입장 — 별도 필드)
```

### 입금 확인 처리

- 이벤트 소유자만 가능 (`/dashboard/events/[id]`)
- pending ↔ confirmed 전환 가능 (실수 대응)
- pending/confirmed → cancelled 전환 가능
- `status: 'pending'` 상태에서는 QR 스캔 시 입장 처리 불가 (경고 표시)

### QR 토큰

- QR 코드에는 `qr_token` (UUID)만 인코딩 — 개인정보 노출 없음
- 스캔 시 서버에서 토큰으로 예약 조회 → 이름, 입금상태, 입장여부 표시
- 이미 입장 처리된 경우 "재입장 시도" 경고 표시

### 참석자 인증 (이중 경로)

**로그인 참석자**:
- 예매 시 user_id가 booking에 연결됨
- `/dashboard/bookings`에서 자신의 전체 예약 목록 확인 가능
- 비밀번호 입력 불필요

**비회원 참석자**:
- 예매 시 이름 + 비밀번호 입력 → password_hash로 저장
- `/e/[slug]/me`에서 이름+비밀번호로 본인 예약 조회
- 비밀번호는 서버에서 bcrypt 비교 (클라이언트에 hash 노출 금지)

### 예매 흐름 (참석자 관점)

```
/e/[slug]                  이벤트 정보 페이지
  ├── 포스터 이미지          poster_url
  ├── 안내 (리치텍스트)      description (HTML)
  ├── 일시/장소/가격 등      기본 정보
  └── [예매하기] 버튼        → 예매 폼으로 이동 (같은 페이지 내 스텝 전환 또는 별도 경로)

예매 폼
  ├── 기본 필드: 이름, (비회원 시 비밀번호), 입금자명, 입금시간
  ├── 커스텀 필드: 이벤트 소유자가 설정한 추가 필드
  └── [예매 제출] → status='pending' 생성
```

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
| 통합 인증 + 비회원 예매 병행  | 로그인하면 대시보드에서 이벤트/예약 관리, 비회원은 이름+비밀번호로 예매·조회 |
| QR에 UUID만 인코딩            | 개인정보 보호, 토큰 무효화 가능                         |
| 계좌이체 전용                 | 카드 PG 연동 불필요, 공연자가 직접 확인                 |
| slug 기반 참석자 URL          | 공연 ID 노출 없이 공유 가능, 메인에서 검색 불가         |
| App Router 서버 컴포넌트 우선 | 예매 폼 외 대부분 읽기 전용, SEO 불필요하지만 성능 이점 |
| Supabase RLS                  | 공연자별 데이터 격리를 DB 레벨에서 보장                 |

@AGENTS.md
