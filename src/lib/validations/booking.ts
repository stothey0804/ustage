import { z } from "zod";

export const bookingApiSchema = z.object({
  event_id: z.string().uuid("올바른 이벤트 ID가 아닙니다."),
  name: z.string().min(1, "이름을 입력해 주세요."),
  depositor_name: z.string().min(1, "입금자명을 입력해 주세요."),
  deposited_at: z.string().min(1, "입금 시간을 입력해 주세요."),
  password: z.string().optional(),
  custom_answers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type BookingApiInput = z.infer<typeof bookingApiSchema>;

// 폼 전용 스키마: password 는 optional, 비회원 여부에 따라 onSubmit 에서 검증
export const bookingFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  depositor_name: z.string().min(1, "입금자명을 입력해 주세요."),
  deposited_at: z.string().min(1, "입금 시간을 입력해 주세요."),
  password: z.string().optional(),
  custom_answers: z.record(z.string(), z.string()).optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
