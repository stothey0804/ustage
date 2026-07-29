import { format } from "date-fns";
import { ko } from "date-fns/locale";

import type { CustomField } from "@/lib/validations/event";
import { bookingCode } from "@/lib/booking-code";

export type CsvBooking = {
  id: string;
  name: string;
  email?: string | null;
  quantity: number | null;
  depositor_name: string;
  deposited_at: string;
  status: string;
  created_at: string | null;
  custom_answers?: unknown;
  booking_tickets?: { checked_in: boolean }[];
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
    "예약번호",
    "이름",
    "이메일",
    "매수",
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
    const checkedIn = tickets.filter((t) => t.checked_in).length;
    const quantity = b.quantity ?? 1;
    const answers = (b.custom_answers ?? {}) as Record<string, unknown>;
    return [
      bookingCode(b.id),
      b.name,
      b.email ?? "",
      quantity,
      b.depositor_name,
      b.deposited_at,
      bookingStatusLabel(b.status, opts.isFree),
      `${checkedIn}/${quantity}`,
      ...(opts.isFree ? [] : [opts.price * quantity]),
      ...fields.map((f) => {
        const v = answers[f.id];
        if (typeof v === "boolean") return v ? "예" : "아니오";
        return v ?? "";
      }),
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
