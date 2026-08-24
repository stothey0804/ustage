import { Resend } from "resend";
import QRCode from "qrcode";

import { LOTTERY_NOTICE_TEXT } from "@/lib/lottery-notice";

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
  /** 인원 번호 — 현장 호명·추첨 기준. 없으면 ticket_number로 표시 */
  attendee_no?: number | null;
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
    const label = ticket.attendee_no ?? ticket.ticket_number;
    // 입장번호는 현장 호명·추첨의 기준이라 QR보다 먼저 눈에 들어와야 한다
    blocks.push(`
    <div style="display:inline-block;margin:8px;padding:14px 16px;border:1px solid #e5e5e5;border-radius:8px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#666;letter-spacing:0.04em;">입장번호</p>
      <p style="margin:2px 0 10px;font-size:40px;line-height:1.1;color:#2b8a8a;font-weight:700;">#${label}</p>
      <img src="cid:${cid}" width="180" height="180" alt="입장 QR${tickets.length > 1 ? ` #${ticket.ticket_number}` : ""}" style="display:block;" />
    </div>`);
  }

  const html = `
    <div style="margin:20px 0 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#666;">입장 QR 코드 — 행사장 입구에서 보여주세요</p>
      <div style="text-align:center;">${blocks.join("")}</div>
      <table role="presentation" style="width:100%;border-collapse:separate;margin:12px 0 0;background:#f0f7f7;border:1px solid #cfe3e3;border-radius:8px;">
        <tr>
          <td style="padding:12px 14px;font-size:13px;line-height:1.6;color:#4a4a4a;">
            <strong style="color:#1a1a1a;">${LOTTERY_NOTICE_TEXT.lead}</strong> ${LOTTERY_NOTICE_TEXT.action}
          </td>
        </tr>
      </table>
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
  /** 인원 번호 표기 (`#2` 또는 `#2–3`) — 현장 추첨·호명 기준이라 메일에 남긴다 */
  bookingNoLabel?: string | null;
}): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#666;width:80px;">스테이지</td>
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
      ${
        params.bookingNoLabel
          ? `<tr>
        <td style="padding:8px 0;color:#666;">예매번호</td>
        <td style="padding:8px 0;font-weight:600;color:#2b8a8a;">${params.bookingNoLabel}</td>
      </tr>`
          : ""
      }
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
  /** 전달 시 QR을 본문에 인라인 포함 (무료 스테이지 — 신청 즉시 확정) */
  tickets?: EmailTicket[];
  /** 인원 번호 표기 (`#2` 또는 `#2–3`) */
  bookingNoLabel?: string | null;
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
  bookingNoLabel,
}: BookingConfirmationParams): Promise<void> {
  const qrParts =
    tickets && tickets.length > 0 ? await buildQrParts(tickets) : null;

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">예매가 ${isFree ? "확정" : "접수"}되었습니다</h1>

    ${infoTableHtml({ eventTitle, eventDate, eventVenue, name, quantity, bookingNoLabel })}

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

interface StaffInviteParams {
  to: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  /** 초대 수락 링크 (토큰 포함) */
  acceptUrl: string;
}

/** 스테이지 스태프 초대 메일 — 링크 클릭이 곧 이메일 소유 증명이다 */
export async function sendStaffInvite({
  to,
  eventTitle,
  eventDate,
  eventVenue,
  acceptUrl,
}: StaffInviteParams): Promise<void> {
  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">스테이지 스태프로 초대받았습니다</h1>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#666;width:80px;">스테이지</td>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(eventTitle)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">일시</td>
        <td style="padding:8px 0;">${eventDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">장소</td>
        <td style="padding:8px 0;">${escapeHtml(eventVenue)}</td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#666;">
      수락하면 이 스테이지의 <strong style="color:#1a1a1a;">예매 명단 확인, 입금 확인, QR 입장 처리,
      현장 예매, 추첨</strong>을 할 수 있습니다. 스테이지 수정·삭제와 스태프 관리는 주최자만 할 수 있어요.
    </p>
    <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#999;">
      참석자의 이름·이메일 등 개인정보를 보게 되므로, 명단은 행사 운영 목적으로만 사용해 주세요.
    </p>

    ${footerHtml(acceptUrl, "초대 수락하기")}

    <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#999;text-align:center;">
      초대 링크는 7일 후 만료됩니다. 본인이 요청하지 않았다면 이 메일은 무시해 주세요.
    </p>
  </div>
</div>
  `.trim();

  await sendEmail({
    to,
    subject: `[어스테이지] ${eventTitle} 스태프 초대`,
    html,
  });
}

interface BookingCancelledParams {
  to: string;
  name: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  /** 주최자 연락처 — 환불 문의 안내용 */
  contact: string;
  /** 취소·환불 규정 (서버에서 sanitize된 HTML) */
  cancelPolicyHtml?: string;
  /** true면 주최자가 취소한 경우 — 참석자는 본인이 취소한 게 아니라 통보를 받는다 */
  byOwner?: boolean;
  /**
   * 부분 취소일 때만 채운다 — 취소된 인원 번호와 남은 매수.
   * 채우면 "예약 전체 취소"가 아니라 "일부 티켓 취소" 문구로 바뀐다.
   */
  partial?: {
    cancelledAttendeeNos: number[];
    remainingQuantity: number;
    /** 유료 스테이지의 환불 대상 금액(취소 매수 × 가격). 무료면 undefined */
    refundAmount?: number;
  };
}

/** 예약 취소 안내 메일 (참석자 본인 취소 / 주최자 취소 공용) — 환불은 주최자 문의로 안내 */
export async function sendBookingCancelled({
  to,
  name,
  quantity,
  eventTitle,
  eventDate,
  eventVenue,
  contact,
  cancelPolicyHtml,
  byOwner = false,
  partial,
}: BookingCancelledParams): Promise<void> {
  const cancelledLabel = partial
    ? partial.cancelledAttendeeNos.map((no) => `#${no}`).join(", ")
    : "";

  const heading = partial
    ? "예약 일부가 취소되었습니다"
    : byOwner
      ? "주최자가 예약을 취소했습니다"
      : "예약이 취소되었습니다";
  const lead = partial
    ? `취소된 티켓 ${cancelledLabel}의 입장 QR은 더 이상 사용할 수 없습니다. 남은 ${partial.remainingQuantity}매는 그대로 유효합니다.` +
      (partial.refundAmount
        ? ` 환불 대상 금액은 ${partial.refundAmount.toLocaleString()}원이며, 환불은 주최자가 직접 처리합니다.`
        : " 환불이 필요하면 주최자에게 문의해 주세요.")
    : byOwner
      ? "발급된 입장 QR은 더 이상 사용할 수 없습니다. 취소 사유와 환불은 주최자에게 문의해 주세요."
      : "입장 QR은 더 이상 사용할 수 없습니다. 환불이 필요하면 주최자에게 문의해 주세요.";

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">${heading}</h1>

    ${infoTableHtml({ eventTitle, eventDate, eventVenue, name, quantity })}

    <p style="margin:20px 0 0;font-size:13px;color:#666;">
      ${lead}
    </p>
    <div style="margin:12px 0 0;padding:16px;background:#f5f5f5;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#666;">주최자 연락처</p>
      <p style="margin:0;font-size:14px;font-weight:600;">${escapeHtml(contact)}</p>
    </div>

    ${
      cancelPolicyHtml
        ? `
    <div style="margin:20px 0 0;padding:16px;border:1px solid #e5e5e5;border-radius:8px;font-size:13px;color:#444;">
      <p style="margin:0 0 8px;font-size:12px;color:#666;font-weight:600;">취소·환불 규정</p>
      ${cancelPolicyHtml}
    </div>`
        : ""
    }

    <p style="margin:24px 0 0;font-size:11px;color:#999;text-align:center;">
      이 메일은 어스테이지에서 자동 발송되었습니다.
    </p>
  </div>
</div>
  `.trim();

  await sendEmail({
    to,
    subject: partial
      ? `[어스테이지] ${eventTitle} 예약 일부(${cancelledLabel}) 취소`
      : byOwner
        ? `[어스테이지] ${eventTitle} 예약이 취소되었습니다`
        : `[어스테이지] ${eventTitle} 예약 취소 완료`,
    html,
  });
}

interface OwnerCancelNoticeParams {
  to: string;
  /** 취소한 참석자 이름 */
  attendeeName: string;
  attendeeEmail: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  /** 스테이지 상세(명단) URL */
  manageUrl: string;
  /** 취소 시점의 예약 상태 — 유료 스테이지에서 환불 필요 여부 판단용 */
  wasConfirmed: boolean;
  /** 무료 스테이지인지 — 무료는 입금·환불 개념이 없어 문구가 달라진다 */
  isFree?: boolean;
}

/** 참석자가 스스로 취소했을 때 주최자에게 보내는 알림 */
export async function sendOwnerCancelNotice({
  to,
  attendeeName,
  attendeeEmail,
  quantity,
  eventTitle,
  eventDate,
  manageUrl,
  wasConfirmed,
  isFree = false,
}: OwnerCancelNoticeParams): Promise<void> {
  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">참석자가 예약을 취소했습니다</h1>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#666;width:80px;">스테이지</td>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(eventTitle)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">일시</td>
        <td style="padding:8px 0;">${eventDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">참석자</td>
        <td style="padding:8px 0;">${escapeHtml(attendeeName)} (${quantity}매)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;">이메일</td>
        <td style="padding:8px 0;">${escapeHtml(attendeeEmail)}</td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:13px;color:#666;">
      ${
        isFree
          ? "무료 스테이지 예약이라 환불 처리는 없습니다. 좌석은 자동으로 반환되었습니다."
          : wasConfirmed
            ? "입금이 확인된 예약이었습니다. 환불 처리가 필요한지 확인해 주세요."
            : "입금 대기 상태였던 예약입니다. 좌석은 자동으로 반환되었습니다."
      }
    </p>

    ${footerHtml(manageUrl, "예매 명단 확인하기")}
  </div>
</div>
  `.trim();

  await sendEmail({
    to,
    subject: `[어스테이지] ${eventTitle} 예약 취소 — ${attendeeName}`,
    html,
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
  /** 인원 번호 표기 (`#2` 또는 `#2–3`) */
  bookingNoLabel?: string | null;
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
  bookingNoLabel,
}: BookingConfirmedParams): Promise<void> {
  const qrParts = await buildQrParts(tickets);

  const html = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="padding:32px 24px;border:1px solid #e5e5e5;border-radius:12px;">
    <h1 style="font-size:20px;margin:0 0 24px;color:#2b8a8a;">입금이 확인되어 예매가 확정되었습니다</h1>

    ${infoTableHtml({ eventTitle, eventDate, eventVenue, name, quantity, bookingNoLabel })}

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
