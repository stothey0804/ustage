import { z } from "zod";

export const bookingApiSchema = z.object({
  event_id: z.string().uuid("올바른 이벤트 ID가 아닙니다."),
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
