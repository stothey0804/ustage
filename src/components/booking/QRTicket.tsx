"use client";

import QRCode from "react-qr-code";

import { LotteryNotice } from "@/components/booking/LotteryNotice";

interface Ticket {
  qr_token: string;
  ticket_number: number;
  checked_in: boolean;
  /** 인원 번호 — 현장 호명·추첨 기준 */
  attendee_no?: number | null;
  /** 부분 취소된 티켓 — QR을 감추고 취소로 표시한다 */
  cancelled_at?: string | null;
}

interface QRTicketProps {
  name: string;
  tickets: Ticket[];
}

export function QRTicket({ name, tickets }: QRTicketProps) {
  const total = tickets.length;

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.qr_token}
          className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 text-center"
        >
          {/* 입장번호는 현장 호명·추첨의 기준 — 캡처 화면에서 가장 먼저 읽혀야 한다 */}
          <div className="space-y-0.5">
            <p className="text-[11px] tracking-wide text-gray-500">입장번호</p>
            <p className="font-mono text-4xl font-bold leading-none text-primary">
              #{ticket.attendee_no ?? ticket.ticket_number}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            {name}
            {total > 1 && (
              <span className="text-muted-foreground ml-1">
                ({ticket.ticket_number}/{total})
              </span>
            )}
          </p>
          {ticket.cancelled_at ? (
            <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded bg-rose-50 text-rose-700">
              <p className="text-sm font-medium">취소된 티켓</p>
            </div>
          ) : ticket.checked_in ? (
            <div className="flex items-center justify-center w-full max-w-[200px] aspect-square rounded bg-green-50 text-green-700">
              <p className="text-sm font-medium">입장 완료</p>
            </div>
          ) : (
            <div className="bg-white p-2 rounded w-full max-w-[232px]">
              <QRCode
                value={ticket.qr_token}
                style={{ width: "100%", height: "auto" }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500">
            {ticket.cancelled_at
              ? "이 티켓은 취소되어 입장할 수 없습니다"
              : ticket.checked_in
                ? "이미 입장 처리되었습니다"
                : "현장에서 스캔해 주세요"}
          </p>
        </div>
      ))}

      {/* 캡처를 유도하는 안내 — 티켓 목록 아래 한 번만 */}
      <LotteryNotice />
    </div>
  );
}
