# AWS SES 이관 계획 (보류 중 — 착수 전 이 문서부터 읽는다)

작성 2026-08-20 · 상태 **미착수** · 현재 발송은 Resend 유지

## 왜

Resend 무료 플랜이 **일 100통 / 월 3,000통**이다. 입금확인 일괄 처리(50명 확정 = 50통)와
가입 인증이 겹치는 날 상한에 걸린다. SES는 일 상한이 없고 비용이 월 $1 미만이다.

## 결론 (검증 완료 — 2026-08-20)

- **이관 가능. 하드 블로커 없음.** 게이트는 **프로덕션 액세스 승인** 하나.
- **SES가 맞는 선택이지만 "당장 급한 불"용은 아니다.** 상한이 이번 주 문제라면
  Resend Pro($20/월, 이관 비용 0)를 보험으로 쓰면서 Phase 0~1을 병행하는 편이 안전하다.
- 리스크 2개: ① 프로덕션 심사(초기 응답 24h, 거절 가능·공식 사유 목록 없음)
  ② 바운스·신고율 관리 의무(**5% review / 10% 발송 정지**).

## 검증 결과 (사실/추측 구분)

| 항목 | 판정 | 요점 |
| --- | --- | --- |
| 샌드박스 | 사실 | 일 200통·초당 1통·**검증된 수신자만**·리전별 별개. 승인 후 기본 일 5만통 |
| CID 인라인 첨부 | 사실(조건부) | **2025-04부터 SES v2 `SendEmail` Simple content가 첨부 공식 지원** — raw MIME 불필요. `Attachment{FileName, RawContent, ContentId, ContentDisposition:"INLINE", ContentTransferEncoding:"BASE64"}` + HTML `cid:`. ⚠️ 인라인이 `multipart/related`가 아닌 `multipart/mixed`로 조립된다는 커뮤니티 보고(부분 확인) → **실수신 렌더링 테스트가 채택 조건**, 실패 시 nodemailer 7 우회 |
| DNS 충돌 | 사실: **없음** | Easy DKIM은 무작위 토큰 셀렉터 CNAME 3개 → `resend._domainkey`(TXT)와 공존. SPF는 MAIL FROM 기준이고 SES 기본 MAIL FROM이 amazonses.com이라 현 루트 SPF 그대로 둬도 됨. DMARC는 DKIM 정렬만으로 통과 → **무중단 병행 발송 가능** |
| 바운스 의무 | 사실 | 바운스 **5% review / 10% 정지**, 신고 0.1% / 0.5%. account-level suppression list 기본 활성(하드 바운스 자동 등재) — **Resend와 달리 API로 조회·해제 가능**(`Get/List/DeleteSuppressedDestination`). 알림은 SNS 토픽 → HTTPS 구독 |
| Supabase Auth SMTP | 사실: 문제 없음 | Supabase가 SES를 호환 서비스로 명시. `email-smtp.ap-northeast-2.amazonaws.com` 587(STARTTLS). **전환 직후 시간당 30통 제한 → Auth → Rate Limits에서 상향 필요**. 템플릿(`supabase/templates/`) 무수정 |
| kakao.com 도달률 | **추측(합리적)** | Resend가 SES 인프라를 쓴다는 공식 자인은 없음. 다만 Resend가 요구하는 DNS가 `include:amazonses.com` + `feedback-smtp.*.amazonses.com`이라 강한 간접 근거. 카카오 차단 정책은 SPF 기반이며 해법은 어느 쪽이든 동일(정렬 + 화이트리스트 신청) |
| 회귀 위험 | 사실(코드 확인) | 일괄 발송은 `after()` 안 순차 `for … await`(`src/app/actions/booking.ts`)라 전송률 문제 없음. SES SDK는 Throttling·MessageRejected를 **throw**(Resend는 `{error}` 반환) → 어댑터에서 정규화 필요. 50통 × QR 생성 ≈ 15~25초가 `after()`에서 도므로 **Vercel maxDuration 확인 필요** |
| 비용 | 사실(**정정**) | **신규 계정은 2026-07-21부터 $0.16/1,000통**(Essentials). $0.10은 2025-06-01 이전 사용 이력 계정의 종량제. 첨부 $0.12/GB(QR ~1KB 무시 가능). 월 5천통이면 **월 $1 미만**. 무료 티어(월 3,000건 12개월)는 신규 종료, 대신 신규 AWS 계정에 6개월 $200 크레딧 |

## Blocker

1. **프로덕션 액세스 승인** (하드) — 승인 전엔 실서비스 발송 불가. 다른 작업과 무관하게 **가장 먼저 신청**.
   승인을 돕는 요소: 도메인 선검증, 구체적 use case("폐쇄형 공연 예매 트랜잭션 메일, 수신자는 예매 제출자 본인,
   바운스는 SNS webhook으로 처리"), 웹사이트 URL.
2. **CID 실수신 검증** (소프트) — Gmail·네이버·카카오·Outlook. 실패 시 nodemailer 7 경로.
3. **바운스 감지 미구현** (소프트) — 소규모에선 kakao 하드 바운스 2건/20통 = 10%로 순식간에 정지선에 닿는다.
   기본 동작(Return-Path 이메일 포워딩)이 있어 즉시 위험은 아니지만 전환 직후 단계로 당길 것.

## 실행 계획

### Phase 0 — AWS 준비 (코드 0, Resend 무중단, 지금 시작 가능)

- **콘솔**: 리전 `ap-northeast-2`(서울) → SES identity로 `privateustage.com` 도메인 생성(Easy DKIM)
  → **프로덕션 액세스 신청** → (선택·권장) 커스텀 MAIL FROM `mail.privateustage.com`
- **DNS**: Easy DKIM CNAME 3개 추가 (**기존 `resend._domainkey` 삭제 금지**).
  커스텀 MAIL FROM 쓰면 `mail.privateustage.com`에 MX `10 feedback-smtp.ap-northeast-2.amazonses.com`
  **정확히 1개** + TXT `v=spf1 include:amazonses.com ~all`. 루트 SPF·DMARC는 그대로.
  (별건 권장: DMARC에 `rua=` 추가 — 지금 `p=none;`만 있다)
- **검증**: identity Verified 확인 → **샌드박스 상태에서** 본인 주소(gmail·naver·**kakao.com**)를
  검증 수신자로 등록하고 QR 첨부 테스트 발송 → 각 클라이언트에서 인라인 렌더링 + "원본 보기" MIME 확인.
  **이 결과가 Simple vs nodemailer 경로를 결정한다.**
- 롤백: 해당 없음(발송 경로 미변경)

### Phase 1 — 코드: provider 추상화 (기본값 resend → 배포해도 동작 불변)

- `src/lib/email/provider.ts` 신설: `EmailProvider` 인터페이스 + resend/ses 어댑터 + env 스위치
- `src/lib/email.ts`의 `sendEmail()`만 어댑터 호출로 교체 — **템플릿 6종·`buildQrParts`·호출부 6곳 무수정**
- `npm i @aws-sdk/client-sesv2` (Simple 경로) 또는 `nodemailer@^7` (Raw 경로)
- vitest: 첨부 매핑(base64 → `RawContent`, `ContentId`, `INLINE`) 순수 함수 테스트
- 롤백 불필요(동작 불변)

### Phase 2 — 앱 메일 전환 (프로덕션 승인 후)

- Vercel **Preview**에 `EMAIL_PROVIDER=ses` + 자격증명 → 6종 메일 실발송 → Production 전환
- 검증: QR 렌더링, 일괄 입금확인 10건+ 소요 시간 로그, Vercel 함수 duration, MessageId 로그
- **롤백: `EMAIL_PROVIDER=resend` 되돌리고 재배포 — 수 분.** Resend 키·도메인 검증을 해지하지 않는 것이 전제

### Phase 3 — Supabase Auth SMTP (Phase 2와 독립)

- SES 콘솔 → Create SMTP Credentials(서울) → Supabase Authentication → Emails → SMTP Settings
  (host `email-smtp.ap-northeast-2.amazonaws.com`, 587, From은 검증 도메인 주소)
- **Auth → Rate Limits에서 시간당 30통 제한 상향**(예: 100~200)
- 검증: 가입 인증·비밀번호 재설정·이메일 변경 3종 실수신(**kakao.com 포함** — 원래 미도달 신고 대응)
- 롤백: SMTP Settings off(기본 SMTP 복귀) 또는 Resend SMTP로 교체

### Phase 4 — 바운스 처리 (전환 후 2주 내)

- configuration set → event destination(SNS: Bounce·Complaint) → HTTPS 구독 `/api/webhooks/ses`
- `src/app/api/webhooks/ses/route.ts`(SNS 서명 검증 + `SubscriptionConfirmation` 처리)
  + `email_bounces` 마이그레이션 + 명단 "메일 반송" 배지 — **기존 반송 감지 계획과 접점 동일**
- suppression 해제는 `DeleteSuppressedDestination`으로 코드에서 처리 가능(Resend 대비 개선점)
- 검증: `bounce@simulator.amazonses.com`으로 유발 → webhook 수신 → 테이블 기록. 콘솔 reputation 모니터링

### Phase 5 — 정리

- 4주 무사고 후 Resend 다운그레이드/해지 결정. **DNS의 resend 레코드는 마지막에** 정리.
  `RESEND_*` 환경변수는 롤백 창구가 필요 없어질 때 제거

## 코드 설계

**1안(권장): `@aws-sdk/client-sesv2` 직접 + Simple content.** 의존성 1개, 조립 코드가 얇다.
**2안: nodemailer 7 + SES 트랜스포트** — Phase 0에서 MIME 문제가 확인될 때만.
(주의: nodemailer는 **7.x부터** `@aws-sdk/client-sesv2` 지원. 6.x 스타일 `SES:{ses,aws}` 설정은 7에서 `ECONFIG`)

환경변수 (Vercel의 `AWS_*` 예약 여부 확인 필요 → 커스텀 이름 권장):

```
EMAIL_PROVIDER=resend | ses     # 미설정 시 resend (즉시 롤백 스위치)
EMAIL_FROM="어스테이지 <no-reply@privateustage.com>"   # RESEND_FROM_EMAIL 대체(공용)
SES_REGION=ap-northeast-2
SES_ACCESS_KEY_ID=…             # ses:SendEmail 전용 IAM 사용자
SES_SECRET_ACCESS_KEY=…
RESEND_API_KEY=…                # 롤백 위해 유지
```

```ts
// src/lib/email/provider.ts (초안)
export interface SendInput {
  to: string; subject: string; html: string;
  replyTo?: string;   // 현재 미사용 — 인터페이스만 열어둔다(no-reply 개선 여지)
  attachments?: { filename: string; content: string /* base64 */; contentId: string }[];
}
export interface SendResult { id: string | null; error: unknown | null }

// ses 어댑터: SendEmailCommand({
//   FromEmailAddress: EMAIL_FROM, Destination: { ToAddresses: [to] },
//   Content: { Simple: {
//     Subject: { Data: subject, Charset: "UTF-8" },
//     Body: { Html: { Data: html, Charset: "UTF-8" } },
//     Attachments: attachments?.map(a => ({
//       FileName: a.filename,
//       RawContent: Buffer.from(a.content, "base64"),
//       ContentId: a.contentId, ContentDisposition: "INLINE",
//       ContentType: "image/png", ContentTransferEncoding: "BASE64",
//     })),
//   }},
// })
```

- **에러 정규화**: Resend는 `{error}` 반환, SES는 **throw** → 어댑터가 `SendResult`로 통일해
  기존 `sendEmail()` 로깅 구조 유지. `ThrottlingException`/`TooManyRequestsException`만
  **1회 지수 백오프 재시도**. 로그에 `error.name`을 남겨 `MessageRejected`(승인·검증 문제)와 구분
- **lazy 초기화**: `SESv2Client`를 모듈 top-level이 아니라 첫 발송 시 생성(cold start, resend 모드에서 미실행)
- **한글 발신자 표시 이름**이 Simple 경로에서 encoded-word로 처리되는지 Phase 0 테스트 항목에 포함
  (안 되면 `=?UTF-8?B?…?=` 헬퍼 추가)

## 하지 말 것

1. **Resend DNS 레코드(`resend._domainkey`, send 서브도메인 SPF/MX)를 지우지 말 것** — 병행·롤백의 전제
2. **샌드박스 상태로 전환 금지** — 검증 안 된 수신자 전부 실패. `EMAIL_PROVIDER=ses`는 승인 확인 후에만
3. **샌드박스에서 일괄 발송 테스트 금지** — 초당 1통 스로틀(프로덕션과 다른 실패 양상)
4. **v1 API(`SendRawEmail`)·nodemailer 6.x 예제를 따르지 말 것**
5. **suppression list를 잊지 말 것** — SES도 하드 바운스를 자동 등재하고 이후 조용히 미발송(쿼터는 소모).
   kakao 휴면 문제는 SES에서도 재현된다. 차이는 API로 해제 가능하다는 것뿐
6. **커스텀 MAIL FROM의 MX는 정확히 1개** — 다른 MX가 있는 이름에 붙이면 검증 실패
7. **Supabase SMTP 전환 후 rate limit 상향을 잊지 말 것**
8. **`{{ .ConfirmationURL }}`로 되돌아가지 말 것** — SMTP 공급자만 바뀌므로 템플릿은 손대지 않는다

## Resend Pro와의 비교

| | Resend Pro ($20/월) | AWS SES (신규 계정) |
| --- | --- | --- |
| 일 100통 상한 해결 | **즉시** | 승인 후 |
| 비용 | $20/월 고정 | **월 $1 미만** |
| 이관 공수 | **0** | 코드 1~2일 + 콘솔/DNS 반나절 + 검증 |
| 승인 리스크 | 없음 | 프로덕션 심사 |
| 바운스 처리 | 대시보드 + webhook | 직접 구현 의무(정지 정책) — 단 어차피 할 일이고 SES는 API 제어 가능 |
| CID 첨부 | 검증 완료(현재 동작) | 공식 지원, 실수신 검증 필요 |

## 착수 전 확인할 것

- [ ] **2025-06-01 이전 SES 사용 이력이 있는 AWS 계정이 있는가** (있으면 $0.10 종량제 유지)
- [ ] Vercel 함수 `maxDuration` 설정값 (일괄 발송 15~25초)
- [ ] Vercel의 `AWS_*` 예약 환경변수 여부
- [ ] 프로덕션 승인 후 실제 초당 전송률(공식 문서에 없음 — 콘솔에서 확인)
- [ ] Simple content CID의 실수신 렌더링(Phase 0)
- [ ] 한글 발신자 표시 이름 인코딩(Phase 0)

## 출처

- [프로덕션 액세스 신청](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) ·
  [쿼터](https://docs.aws.amazon.com/ses/latest/dg/quotas.html) ·
  [일 5만 통 기본값](https://aws.amazon.com/blogs/ses/all-about-ses-daily-quota/)
- [Attachment API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_Attachment.html) ·
  [첨부 가이드](https://docs.aws.amazon.com/ses/latest/dg/attachments.html) ·
  [출시 공지(2025-04)](https://aws.amazon.com/about-aws/whats-new/2025/04/amazon-ses-attachments-sending-apis)
- [SPF](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html) ·
  [DMARC](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html) ·
  [MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)
- [정지 정책 FAQ](https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html) ·
  [suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html) ·
  [알림](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html)
- [Supabase auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp) ·
  [SMTP 자격증명](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html)
- [SES 요금](https://aws.amazon.com/ses/pricing/) ·
  [요금제 개편](https://aws.amazon.com/blogs/messaging-and-targeting/introducing-amazon-simple-email-service-ses-pricing-plans/)
- [nodemailer SES 트랜스포트](https://nodemailer.com/transports/ses)
