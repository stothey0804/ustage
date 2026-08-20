/**
 * 브랜드 마크(무대 위 스포트라이트·마이크) 벡터 — **문자열 단일 출처.**
 *
 * 인앱 렌더(`components/BrandMark.tsx`)와 OG 이미지(`app/opengraph-image.tsx`)가
 * 같은 값을 쓴다. OG는 Satori로 그리므로 JSX 컴포넌트를 그대로 넣을 수 없고
 * data URI(`brandMarkDataUri`)로 넘겨야 해서 문자열 형태로 둔다.
 *
 * `public/icon.svg`(파비콘·앱 아이콘)는 정적 파일이라 여기서 import할 수 없다 —
 * 같은 벡터의 쌍둥이이며, 마크를 고치면 **두 곳을 함께** 고쳐야 한다.
 */
export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="bm-bg" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#33a7a0"/>
      <stop offset="0.55" stop-color="#1c8a85"/>
      <stop offset="1" stop-color="#0b5f5c"/>
    </linearGradient>
    <linearGradient id="bm-beam" x1="256" y1="106" x2="256" y2="362" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff7e8" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#fff7e8" stop-opacity="0.06"/>
    </linearGradient>
    <radialGradient id="bm-pool" cx="256" cy="374" r="150" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff7e8" stop-opacity="0.78"/>
      <stop offset="1" stop-color="#fff7e8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bm-bg)"/>
  <ellipse cx="256" cy="376" rx="152" ry="34" fill="url(#bm-pool)"/>
  <polygon points="242,112 270,112 360,360 152,360" fill="url(#bm-beam)"/>
  <rect x="247" y="72" width="18" height="22" rx="6" fill="#fff7e8" opacity="0.6"/>
  <rect x="222" y="90" width="68" height="22" rx="11" fill="#fff7e8"/>
  <g fill="#0a4f4c">
    <rect x="235" y="154" width="42" height="70" rx="21"/>
    <rect x="250" y="214" width="12" height="146" rx="6"/>
    <ellipse cx="256" cy="360" rx="36" ry="9"/>
  </g>
  <g stroke="#1f7a76" stroke-width="3" stroke-linecap="round" opacity="0.55">
    <line x1="243" y1="172" x2="269" y2="172"/>
    <line x1="243" y1="186" x2="269" y2="186"/>
    <line x1="243" y1="200" x2="269" y2="200"/>
  </g>
</svg>`;

/** Satori(<img src>)·CSS background 등에서 쓰는 data URI */
export function brandMarkDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(BRAND_MARK_SVG).toString("base64")}`;
}
