import { format } from "date-fns";
import { ko } from "date-fns/locale";

import type { CustomField } from "@/lib/validations/event";
import { formatBookingNoRange } from "@/lib/booking-code";
import { formatCustomAnswer } from "@/lib/custom-answers";

export type CsvBooking = {
  id: string;
  booking_no?: number | null;
  name: string;
  email?: string | null;
  quantity: number | null;
  /** 부분 취소된 매수 — 유효 매수는 quantity - cancelled_quantity */
  cancelled_quantity?: number | null;
  depositor_name: string;
  deposited_at: string;
  status: string;
  created_at: string | null;
  custom_answers?: unknown;
  booking_tickets?: { checked_in: boolean; cancelled_at?: string | null }[];
};

/** CSV 셀 이스케이프 — 쉼표/따옴표/개행 포함 시 큰따옴표로 감싼다. */
export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function bookingStatusLabel(status: string, isFree: boolean): string {
  if (status === "confirmed") return isFree ? "참가확정" : "입금완료";
  if (status === "cancelled") return "취소";
  return "입금대기";
}

export function buildBookingsCsv(
  bookings: CsvBooking[],
  fields: CustomField[],
  opts: { isFree: boolean; price: number }
): string {
  const headers = [
    "예매번호",
    "이름",
    "이메일",
    "매수",
    "취소매수",
    "입금자명",
    "입금시간",
    "상태",
    "입장",
    ...(opts.isFree ? [] : ["입금액(원)"]),
    ...fields.map((f) => f.label),
    "신청일시",
  ];

  const lines = bookings.map((b) => {
    const tickets = b.booking_tickets ?? [];
    // 부분 취소된 티켓은 입장·금액·매수에서 제외하되, 취소 매수는 별도 컬럼으로 남긴다
    const bought = b.quantity ?? 1;
    const cancelledQuantity =
      b.cancelled_quantity ?? tickets.filter((t) => t.cancelled_at).length;
    const quantity = Math.max(bought - cancelledQuantity, 0);
    const checkedIn = tickets.filter(
      (t) => t.checked_in && !t.cancelled_at
    ).length;
    const answers = (b.custom_answers ?? {}) as Record<string, unknown>;
    return [
      formatBookingNoRange(b.booking_no, bought, b.id),
      b.name,
      b.email ?? "",
      quantity,
      cancelledQuantity,
      b.depositor_name,
      b.deposited_at,
      bookingStatusLabel(b.status, opts.isFree),
      `${checkedIn}/${quantity}`,
      ...(opts.isFree ? [] : [opts.price * quantity]),
      // 표기는 명단 테이블·상세 패널과 같은 함수를 쓴다 (미응답은 빈 값)
      ...fields.map((f) => formatCustomAnswer(f, answers[f.id]) ?? ""),
      b.created_at
        ? format(new Date(b.created_at), "yyyy-MM-dd HH:mm", { locale: ko })
        : "",
    ]
      .map(csvCell)
      .join(",");
  });

  return [headers.map(csvCell).join(","), ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM — Excel에서 한글이 깨지지 않도록
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
