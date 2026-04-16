# 어스테이지(US.tage)

소규모 공연/강연을 위한 폐쇄형 예매 및 입장확인 시스템.

이벤트 소유자가 예매 링크를 직접 공유하고, 참석자는 그 링크를 통해서만 예매할 수 있다. 결제는 계좌이체 전용이며, 이벤트 소유자가 수동으로 입금 확인 처리를 한다. QR 코드로 현장 입장을 확인한다.

## 주요 기능

- **통합 인증**: 역할 구분 없이 한 계정으로 이벤트 생성(공연자)과 예매(참석자) 모두 가능. 비회원 예매도 지원.
- **이벤트 관리**: 생성, 수정, 상태 관리(draft/open/closed), 예매기간 및 좌석한도 설정
- **예매**: 로그인 사용자는 계정 연결, 비회원은 이름+비밀번호로 예매 및 조회
- **입금 확인**: 이벤트 소유자가 예매 명단에서 수동으로 상태 전환(입금대기/참석확정/취소)
- **QR 입장확인**: 참석자에게 QR 코드 발급, 현장에서 카메라로 스캔하여 입장 처리

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

## 시작하기

### 사전 요구사항

- Node.js 20+
- Supabase 프로젝트 (테이블 스키마 실행 완료)

### 환경변수

`.env.local` 파일을 프로젝트 루트에 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # 서버 전용
```

### 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인.

### Supabase 타입 생성

DB 스키마 변경 후:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```

## 프로젝트 구조

```
src/
├── app/
│   ├── dashboard/          # 로그인 전용 (이벤트 관리 + 내 예약)
│   ├── e/[slug]/           # 공개 예매 폼 + 비회원 조회
│   ├── login/, signup/     # 인증
│   ├── auth/callback/      # 이메일 확인 콜백
│   ├── actions/            # Server Actions
│   └── api/                # Route Handlers
├── components/
│   ├── auth/               # 로그인/회원가입 폼
│   ├── dashboard/          # 대시보드 컴포넌트
│   ├── booking/            # 예매 흐름 컴포넌트
│   └── ui/                 # shadcn (자동 생성)
├── lib/
│   ├── supabase/           # 클라이언트 (browser, server, admin)
│   └── validations/        # zod 스키마
├── types/database.ts       # Supabase 자동생성 타입
└── proxy.ts                # /dashboard/* 인증 가드
```
