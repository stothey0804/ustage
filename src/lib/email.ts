import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "어스테이지 <onboarding@resend.dev>";

interface BookingConfirmationParams {
  to: string;
  name: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  isFree: boolean;
  bankInfo: string;
  /** 예약 확인 페이지 URL */
  confirmUrl: string;
}

export async function sendBookingConfirmation({
  to,
  name,
  quantity,
  eventTitle,
  eventDate,
  eventVenue,
  isFree,
  bankInfo,
  confirmUrl,
}: BookingConfirmationParams): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email");
    return;
  }

  const subject = `[어스테이지] ${eventTitle} 예매 확인`;

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">예매가 ${isFree ? "확정" : "접수"}되었습니다</h1>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#666;width:80px;">공연</td>
        <td style="padding:8px 0;font-weight:600;">${eventTitle}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">일시</td>
        <td style="padding:8px 0;">${eventDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">장소</td>
        <td style="padding:8px 0;">${eventVenue}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">예약자</td>
        <td style="padding:8px 0;">${name} (${quantity}매)</td>
      </tr>
    </table>

    ${
      !isFree
        ? `
    <div style="margin:20px 0;padding:16px;background:#f5f5f5;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#666;">입금 계좌</p>
      <p style="margin:0;font-size:14px;font-weight:600;">${bankInfo}</p>
    </div>
    <p style="font-size:13px;color:#666;">입금 확인 후 예매가 확정됩니다.</p>
    `
        : `
    <p style="margin:20px 0 0;font-size:13px;color:#2b8a8a;font-weight:600;">참가가 확정되었습니다.</p>
    `
    }

    <a href="${confirmUrl}" style="display:block;margin:24px 0 0;padding:14px;background:#2b8a8a;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      예약 확인하기
    </a>

    <p style="margin:24px 0 0;font-size:11px;color:#999;text-align:center;">
      이 메일은 어스테이지에서 자동 발송되었습니다.
    </p>
  </div>
</div>
  `.trim();

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[email] send failed", err);
  }
}
