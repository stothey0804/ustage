import { z } from "zod";

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "필드 이름을 입력해 주세요."),
  type: z.enum(["text", "number", "select", "checkbox"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export const eventSchema = z.object({
  title: z.string().min(1, "공연 제목을 입력해 주세요."),
  description: z.string().optional(),
  poster_url: z.string().optional(),
  event_date: z.string().min(1, "공연 일시를 입력해 주세요."),
  venue: z.string().min(1, "공연 장소를 입력해 주세요."),
  price: z.number().min(0, "가격은 0원 이상이어야 합니다."),
  bank_info: z.string(),
  contact: z.string().min(1, "연락처를 입력해 주세요."),
  capacity: z.number().int().min(1, "좌석 수는 1 이상이어야 합니다.").optional(),
  venue_address: z.string().optional(),
  venue_lat: z.number().optional(),
  venue_lng: z.number().optional(),
  booking_start: z.string().optional(),
  booking_end: z.string().optional(),
  custom_fields: z.array(customFieldSchema).optional(),
});

export type EventFormValues = z.infer<typeof eventSchema>;
