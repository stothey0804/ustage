import { z } from "zod";

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "필드 이름을 입력해 주세요."),
  type: z.enum(["text", "number", "select", "checkbox"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

// 빈 문자열/미설정을 걸러 두 일시가 모두 있을 때만 비교. datetime-local("YYYY-MM-DDTHH:mm")은
// 사전식 비교가 곧 시간 비교이므로 문자열 대소 비교로 충분하다.
const bothSet = (a?: string, b?: string): boolean => !!a && !!b;

export const eventSchema = z
  .object({
    title: z.string().min(1, "스테이지 제목을 입력해 주세요."),
    description: z.string().optional(),
    booking_notice: z.string().optional(),
    poster_url: z.string().optional(),
    event_date: z.string().min(1, "스테이지 시작 일시를 입력해 주세요."),
    event_end_date: z.string().optional(),
    venue: z.string().min(1, "스테이지 장소를 입력해 주세요."),
    price: z.number().min(0, "가격은 0원 이상이어야 합니다."),
    bank_info: z.string(),
    contact: z.string().min(1, "연락처를 입력해 주세요."),
    capacity: z
      .number()
      .int()
      .min(1, "좌석 수는 1 이상이어야 합니다.")
      .optional(),
    venue_address: z.string().optional(),
    venue_lat: z.number().optional(),
    venue_lng: z.number().optional(),
    booking_start: z.string().optional(),
    booking_end: z.string().optional(),
    custom_fields: z.array(customFieldSchema).optional(),
  })
  .refine((v) => !bothSet(v.event_end_date, v.event_date) || v.event_end_date! > v.event_date, {
    message: "스테이지 종료 일시는 시작 일시보다 뒤여야 합니다.",
    path: ["event_end_date"],
  })
  .refine((v) => !bothSet(v.booking_start, v.booking_end) || v.booking_start! < v.booking_end!, {
    message: "예매 종료 일시는 시작 일시보다 뒤여야 합니다.",
    path: ["booking_end"],
  })
  .refine((v) => !bothSet(v.booking_end, v.event_date) || v.booking_end! <= v.event_date, {
    message: "예매 종료 일시는 스테이지 시작 일시보다 앞이어야 합니다.",
    path: ["booking_end"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
