import { z } from "zod";

/** 스태프 초대 — 이메일 하나만 받는다(가입 여부는 알려주지 않는다). */
export const staffInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다.")
    .transform((v) => v.toLowerCase()),
});

export type StaffInviteValues = z.infer<typeof staffInviteSchema>;
