/**
 * 어스테이지 브랜드 마크 — 무대 위 스포트라이트·마이크.
 * 파비콘/앱 아이콘(public/icon.svg)과 동일한 벡터를 인라인 SVG로 렌더한다.
 * 장식 용도이므로 기본 aria-hidden — 접근성 이름은 옆의 워드마크 텍스트가 제공한다.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="bm-bg"
          x1="0"
          y1="0"
          x2="0"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#33a7a0" />
          <stop offset="0.55" stopColor="#1c8a85" />
          <stop offset="1" stopColor="#0b5f5c" />
        </linearGradient>
        <linearGradient
          id="bm-beam"
          x1="256"
          y1="106"
          x2="256"
          y2="362"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff7e8" stopOpacity="0.92" />
          <stop offset="1" stopColor="#fff7e8" stopOpacity="0.06" />
        </linearGradient>
        <radialGradient
          id="bm-pool"
          cx="256"
          cy="374"
          r="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff7e8" stopOpacity="0.78" />
          <stop offset="1" stopColor="#fff7e8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#bm-bg)" />
      <ellipse cx="256" cy="376" rx="152" ry="34" fill="url(#bm-pool)" />
      <polygon points="242,112 270,112 360,360 152,360" fill="url(#bm-beam)" />
      <rect x="247" y="72" width="18" height="22" rx="6" fill="#fff7e8" opacity="0.6" />
      <rect x="222" y="90" width="68" height="22" rx="11" fill="#fff7e8" />
      <g fill="#0a4f4c">
        <rect x="235" y="154" width="42" height="70" rx="21" />
        <rect x="250" y="214" width="12" height="146" rx="6" />
        <ellipse cx="256" cy="360" rx="36" ry="9" />
      </g>
      <g stroke="#1f7a76" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <line x1="243" y1="172" x2="269" y2="172" />
        <line x1="243" y1="186" x2="269" y2="186" />
        <line x1="243" y1="200" x2="269" y2="200" />
      </g>
    </svg>
  );
}
