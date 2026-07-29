import { Card, CardContent, CardHeader, CardTitle, RichTextView } from "ustage";

const NOTICE_HTML = `
<h2>공연 안내</h2>
<p>겨울밤의 소극장 콘서트에 오신 것을 환영합니다. 이번 공연은 <strong>어쿠스틱 편성</strong>으로 진행되며, 중간 휴식 없이 약 90분간 이어집니다.</p>
<h3>입장 안내</h3>
<ul>
  <li>공연 시작 30분 전부터 입장이 가능합니다.</li>
  <li>입구에서 <em>QR 티켓</em>을 보여주시면 됩니다.</li>
  <li>공연 시작 후에는 곡과 곡 사이에만 입장할 수 있습니다.</li>
</ul>
<h3>예매 유의사항</h3>
<ol>
  <li>입금 확인 후 확정 메일이 발송됩니다.</li>
  <li>공연 3일 전까지 취소 시 전액 환불됩니다.</li>
</ol>
<blockquote>객석이 40석뿐인 작은 공간입니다. 서로의 밤을 위해 조금만 배려해주세요.</blockquote>
<p>문의는 <a href="#">오픈카톡</a>으로 남겨주세요.</p>
`;

/** The canonical use: sanitized CKEditor HTML rendered inside a Card. */
export function EventNotice() {
  return (
    <Card className="w-[420px] max-w-full">
      <CardHeader>
        <CardTitle>스테이지 안내</CardTitle>
      </CardHeader>
      <CardContent>
        <RichTextView html={NOTICE_HTML} />
      </CardContent>
    </Card>
  );
}

/** Short-form body — the shape most booking_notice values take. */
export function ShortNotice() {
  return (
    <div className="w-[420px] max-w-full">
      <RichTextView
        html={`<p><strong>입금 계좌</strong>: 카카오뱅크 3333-01-2345678 (김서영)</p><p>신청 후 <em>24시간 이내</em> 입금해주셔야 예약이 확정됩니다.</p>`}
      />
    </div>
  );
}
