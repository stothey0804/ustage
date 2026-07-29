import { z } from "zod";

export const bookingApiSchema = z.object({
  event_id: z.string().uuid("올바른 스테이지 ID가 아닙니다."),
  // 추가 구매(additional)에서는 기존 예약에서 상속하므로 선택 — 신규 예매는 라우트에서 필수 검증
  name: z.string().optional().default(""),
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  depositor_name: z.string().optional().default(""),
  deposited_at: z.string().optional().default(""),
  quantity: z.number().int().min(1, "최소 1매 이상이어야 합니다.").max(20, "최대 20매까지 예매할 수 있습니다."),
  password: z.string().optional(),
  custom_answers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  /** true면 추가 구매 — 기존 예약 본인 확인 후 같은 이메일로 예약을 하나 더 생성 */
  additional: z.boolean().optional().default(false),
});

export type BookingApiInput = z.infer<typeof bookingApiSchema>;

// 폼 전용 스키마: password/depositor는 optional, 유료/비회원 여부에 따라 onSubmit에서 검증
export const bookingFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  depositor_name: z.string(),
  deposited_at: z.string(),
  quantity: z.number().int().min(1).max(20),
  password: z.string().optional(),
  custom_answers: z.record(z.string(), z.string()).optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

/**
 * 현장 예매 — 주최자가 명단에서 비회원 예매를 대신 만든다.
 * 현장에서 빠르게 입력해야 하므로 항목을 최소로 둔다(입금자명·입금시간은 서버가 채움).
 */
export const onsiteBookingSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요."),
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
  quantity: z
    .number()
    .int()
    .min(1, "최소 1매 이상이어야 합니다.")
    .max(20, "최대 20매까지 예매할 수 있습니다."),
  /** 미입력 시 서버가 4자리 숫자를 자동 생성해 알려준다 */
  password: z
    .string()
    .trim()
    .min(4, "비밀번호는 4자 이상이어야 합니다.")
    .optional(),
  /** true면 즉시 입금확인(확정) 상태로 만들고 입장 QR 메일을 보낸다 */
  confirmNow: z.boolean(),
});

export type OnsiteBookingValues = z.infer<typeof onsiteBookingSchema>;
