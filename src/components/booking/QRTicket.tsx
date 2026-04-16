"use client";

import QRCode from "react-qr-code";

interface Ticket {
  qr_token: string;
  ticket_number: number;
  checked_in: boolean;
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
          className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 text-center"
        >
          <p className="text-sm font-semibold text-gray-800">
            {name}
            {total > 1 && (
              <span className="text-muted-foreground ml-1">
                ({ticket.ticket_number}/{total})
              </span>
            )}
          </p>
          {ticket.checked_in ? (
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
            {ticket.checked_in ? "이미 입장 처리되었습니다" : "현장에서 스캔해 주세요"}
          </p>
        </div>
      ))}
    </div>
  );
}
