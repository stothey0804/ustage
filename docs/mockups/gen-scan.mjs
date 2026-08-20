import sharp from "sharp";
import { writeFileSync } from "node:fs";

const W = 780, H = 1560;                // 목업 — 내용에 맞춘 높이(하단 여백 제거)
const F = "'Apple SD Gothic Neo','Pretendard',sans-serif";
const TEAL = "#2b8a8a";

/** 결정적 QR 느낌의 모듈 격자 — 실제 스캔 가능한 코드는 아니다(목업) */
function qrModules(x0, y0, size, n = 21) {
  const m = size / n;
  let out = "";
  // finder pattern 3개
  const finder = (cx, cy) => `
    <rect x="${x0 + cx * m}" y="${y0 + cy * m}" width="${m * 7}" height="${m * 7}" fill="#111"/>
    <rect x="${x0 + (cx + 1) * m}" y="${y0 + (cy + 1) * m}" width="${m * 5}" height="${m * 5}" fill="#fff"/>
    <rect x="${x0 + (cx + 2) * m}" y="${y0 + (cy + 2) * m}" width="${m * 3}" height="${m * 3}" fill="#111"/>`;
  out += finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
  // 데이터 모듈(의사난수, 시드 고정)
  let seed = 20260820;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
      if (inFinder) continue;
      if (rand() > 0.52) {
        out += `<rect x="${x0 + c * m}" y="${y0 + r * m}" width="${m}" height="${m}" fill="#111"/>`;
      }
    }
  }
  return out;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <!-- 상단 바 -->
  <text x="48" y="96" font-family=${JSON.stringify(F)} font-size="26" fill="#8a8a8a">‹ 스테이지 상세</text>
  <text x="48" y="164" font-family=${JSON.stringify(F)} font-size="44" font-weight="700" fill="#111">QR 입장확인</text>
  <text x="48" y="208" font-family=${JSON.stringify(F)} font-size="26" fill="#8a8a8a">겨울의 끝, 세 번째 무대</text>

  <!-- 카메라 뷰파인더 -->
  <rect x="48" y="248" width="${W - 96}" height="700" rx="28" fill="#1c1c1e"/>
  <!-- 손에 든 티켓(밝은 카드) 위의 QR -->
  <g transform="translate(0,0)">
    <rect x="196" y="360" width="388" height="476" rx="20" fill="#f7f7f5"/>
    <text x="390" y="416" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="30" font-weight="700" fill="${TEAL}">#3</text>
    <rect x="236" y="440" width="308" height="308" rx="8" fill="#ffffff"/>
    ${qrModules(252, 456, 276)}
    <text x="390" y="800" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="24" fill="#666">홍길동 (2/2)</text>
  </g>
  <!-- 조준 브래킷 -->
  <g stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.95">
    <path d="M176 424 L176 372 Q176 356 192 356 L244 356"/>
    <path d="M604 424 L604 372 Q604 356 588 356 L536 356"/>
    <path d="M176 772 L176 824 Q176 840 192 840 L244 840"/>
    <path d="M604 772 L604 824 Q604 840 588 840 L536 840"/>
  </g>
  <!-- 스캔 라인 -->
  <rect x="176" y="596" width="428" height="6" rx="3" fill="${TEAL}" opacity="0.9"/>
  <text x="${W / 2}" y="908" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="26" fill="#d0d0d0">QR을 사각형 안에 맞춰 주세요</text>

  <!-- 결과 카드 (success) -->
  <rect x="48" y="988" width="${W - 96}" height="330" rx="32" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="4"/>
  <circle cx="112" cy="1056" r="26" fill="none" stroke="#16a34a" stroke-width="7"/>
  <path d="M99 1056 l11 12 l18 -22" fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="164" y="1066" font-family=${JSON.stringify(F)} font-size="32" font-weight="700" fill="#16a34a">입장 확인</text>
  <text x="164" y="1122" font-family=${JSON.stringify(F)} font-size="42" font-weight="700" fill="#111">#3 홍길동 (2/2)</text>
  <text x="164" y="1170" font-family=${JSON.stringify(F)} font-size="26" fill="#6b7280">입장이 확인되었습니다.</text>
  <rect x="164" y="1200" width="150" height="48" rx="24" fill="${TEAL}"/>
  <text x="239" y="1232" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="24" font-weight="600" fill="#ffffff">입금완료</text>
  <text x="336" y="1232" font-family=${JSON.stringify(F)} font-size="24" fill="#9ca3af">2매 중 2번째</text>

  <!-- 다음 스캔 버튼 -->
  <rect x="48" y="1364" width="${W - 96}" height="96" rx="48" fill="${TEAL}"/>
  <text x="${W / 2}" y="1424" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="30" font-weight="600" fill="#ffffff">다음 QR 스캔</text>
  <text x="${W / 2}" y="1520" text-anchor="middle" font-family=${JSON.stringify(F)} font-size="24" fill="#9ca3af">2초 후 자동으로 다음 스캔이 시작됩니다</text>
</svg>`;

writeFileSync(process.argv[2].replace(/\.png$/, ".svg"), svg);
await sharp(Buffer.from(svg)).png().toFile(process.argv[2]);
console.log("written", process.argv[2]);
