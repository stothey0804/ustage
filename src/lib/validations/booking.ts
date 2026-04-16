import { z } from "zod";

export const bookingApiSchema = z.object({
  event_id: z.string().uuid("올바른 이벤트 ID가 아닙니다."),
  name: z.string().min(1, "이름을 입력해 주세요."),
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  depositor_name: z.string().optional().default(""),
  deposited_at: z.string().optional().default(""),
  quantity: z.number().int().min(1, "최소 1매 이상이어야 합니다.").max(10, "최대 10매까지 예매할 수 있습니다."),
  password: z.string().optional(),
  custom_answers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type BookingApiInput = z.infer<typeof bookingApiSchema>;

// 폼 전용 스키마: password/depositor는 optional, 유료/비회원 여부에 따라 onSubmit에서 검증
export const bookingFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  email: z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다."),
  depositor_name: z.string(),
  deposited_at: z.string(),
  quantity: z.number().int().min(1).max(10),
  password: z.string().optional(),
  custom_answers: z.record(z.string(), z.string()).optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
