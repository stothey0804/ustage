"use client";

import QRCode from "react-qr-code";

interface QRTicketProps {
  qrToken: string;
  name: string;
}

export function QRTicket({ qrToken, name }: QRTicketProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-6 text-center">
      <p className="text-sm font-semibold text-gray-800">{name}</p>
      <div className="bg-white p-2 rounded">
        <QRCode value={qrToken} size={200} />
      </div>
      <p className="text-xs text-gray-500">현장에서 스캔해 주세요</p>
    </div>
  );
}
