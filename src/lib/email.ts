import { Resend } from "resend";
import QRCode from "qrcode";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "어스테이지 <onboarding@resend.dev>";

/** confirmUrl 등 메일 내 링크의 베이스 URL */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

/** 사용자 입력이 이메일 HTML에 삽입될 때 마크업으로 해석되지 않도록 이스케이프 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface EmailTicket {
  ticket_number: number;
  qr_token: string;
}

interface QrEmailParts {
  html: string;
  attachments: { filename: string; content: string; contentId: string }[];
}

/**
 * 티켓별 QR PNG를 생성해 CID 인라인 첨부와 대응하는 HTML 블록을 만든다.
 * Gmail 등은 data: URI 이미지를 차단하므로 반드시 CID 첨부 방식을 쓴다.
 */
async function buildQrParts(tickets: EmailTicket[]): Promise<QrEmailParts> {
  const attachments: QrEmailParts["attachments"] = [];
  const blocks: string[] = [];

  for (const ticket of tickets) {
    const cid = `ticket-${ticket.ticket_number}`;
    const png = await QRCode.toBuffer(ticket.qr_token, {
      width: 240,
      margin: 1,
    });
    attachments.push({
      filename: `ticket-${ticket.ticket_number}.png`,
      content: png.toString("base64"),
      contentId: cid,
    });
    blocks.push(`
    <div style="display:inline-block;margin:8px;padding:12px;border:1px solid #e5e5e5;border-radius:8px;text-align:center;">
      ${tickets.length > 1 ? `<p style="margin:0 0 6px;font-size:12px;color:#666;">티켓 #${ticket.ticket_number}</p>` : ""}
      <img src="cid:${cid}" width="180" height="180" alt="입장 QR${tickets.length > 1 ? ` #${ticket.ticket_number}` : ""}" style="display:block;" />
    </div>`);
  }

  const html = `
    <div style="margin:20px 0 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#666;">입장 QR 코드 — 행사장 입구에서 보여주세요</p>
      <div style="text-align:center;">${blocks.join("")}</div>
    </div>`;

  return { html, attachments };
}

function footerHtml(confirmUrl: string, buttonLabel: string): string {
  return `
    <a href="${confirmUrl}" style="display:block;margin:24px 0 0;padding:14px;background:#2b8a8a;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      ${buttonLabel}
    </a>

    <p style="margin:24px 0 0;font-size:11px;color:#999;text-align:center;">
      이 메일은 어스테이지에서 자동 발송되었습니다.
    </p>`;
}

function infoTableHtml(params: {
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  name: string;
  quantity: number;
}): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#666;width:80px;">공연</td>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(params.eventTitle)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">일시</td>
        <td style="padding:8px 0;">${params.eventDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">장소</td>
        <td style="padding:8px 0;">${escapeHtml(params.eventVenue)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">예약자</td>
        <td style="padding:8px 0;">${escapeHtml(params.name)} (${params.quantity}매)</td>
      </tr>
    </table>`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: QrEmailParts["attachments"];
}): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    // Resend SDK는 API 오류 시 throw하지 않고 { error }를 반환한다 —
    // 확인하지 않으면 발송 실패(도메인 미검증 403 등)가 조용히 사라짐
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });

    if (error) {
      console.error("[email] send failed", {
        to: params.to,
        from: FROM_EMAIL,
        error,
      });
      return;
    }
    console.log("[email] sent", data?.id, "→", params.to);
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

interface BookingConfirmationParams {
  to: string;
  name: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  isFree: boolean;
  bankInfo: string;
  /** 총 입금액 (가격 × 매수, 무료면 0) */
  totalAmount: number;
  /** 예약 확인 페이지 URL */
  confirmUrl: string;
  /** 전달 시 QR을 본문에 인라인 포함 (무료 이벤트 — 신청 즉시 확정) */
  tickets?: EmailTicket[];
}

/** 예매 접수(유료: 입금 안내) / 확정(무료: QR 포함) 메일 */
export async function sendBookingConfirmation({
  to,
  name,
  quantity,
  eventTitle,
  eventDate,
  eventVenue,
  isFree,
  bankInfo,
  totalAmount,
  confirmUrl,
  tickets,
}: BookingConfirmationParams): Promise<void> {
  const qrParts =
    tickets && tickets.length > 0 ? await buildQrParts(tickets) : null;

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">예매가 ${isFree ? "확정" : "접수"}되었습니다</h1>

    ${infoTableHtml({ eventTitle, eventDate, eventVenue, name, quantity })}

    ${
      !isFree
        ? `
    <div style="margin:20px 0;padding:16px;background:#f5f5f5;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#666;">입금 계좌</p>
      <p style="margin:0;font-size:14px;font-weight:600;">${escapeHtml(bankInfo)}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#666;">입금 금액</p>
      <p style="margin:0;font-size:14px;font-weight:600;">${totalAmount.toLocaleString()}원${quantity > 1 ? ` (${quantity}매)` : ""}</p>
    </div>
    <p style="font-size:13px;color:#666;">입금 확인 후 예매가 확정됩니다.</p>
    `
        : `
    <p style="margin:20px 0 0;font-size:13px;color:#2b8a8a;font-weight:600;">참가가 확정되었습니다.</p>
    `
    }

    ${qrParts?.html ?? ""}

    ${footerHtml(confirmUrl, "예약 확인하기")}
  </div>
</div>
  `.trim();

  await sendEmail({
    to,
    subject: `[어스테이지] ${eventTitle} 예매 ${isFree ? "확정" : "확인"}`,
    html,
    attachments: qrParts?.attachments,
  });
}

interface BookingConfirmedParams {
  to: string;
  name: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  confirmUrl: string;
  tickets: EmailTicket[];
}

/** 입금 확인(pending → confirmed) 시 발송하는 확정 메일 — 입장 QR 포함 */
export async function sendBookingConfirmed({
  to,
  name,
  quantity,
  eventTitle,
  eventDate,
  eventVenue,
  confirmUrl,
  tickets,
}: BookingConfirmedParams): Promise<void> {
  const qrParts = await buildQrParts(tickets);

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">입금이 확인되어 예매가 확정되었습니다</h1>

    ${infoTableHtml({ eventTitle, eventDate, eventVenue, name, quantity })}

    ${qrParts.html}

    ${footerHtml(confirmUrl, "QR 티켓 확인하기")}
  </div>
</div>
  `.trim();

  await sendEmail({
    to,
    subject: `[어스테이지] ${eventTitle} 예매 확정 — 입장 QR`,
    html,
    attachments: qrParts.attachments,
  });
}
