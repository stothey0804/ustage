import { ImageResponse } from "next/og";

import { brandMarkDataUri } from "@/lib/brand-mark";

export const alt = "us.tage(어스테이지) — 소규모 공연 예매 · QR 입장 시스템";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "소규모 공연 예매 · QR 입장 시스템";
const SUB = "링크 하나로 예매부터 입장까지";

/**
 * 사용된 글자만 서브셋된 한글 폰트를 Google Fonts에서 받아온다
 * (ImageResponse는 폰트 데이터를 직접 넘겨야 한글이 렌더링됨).
 */
async function loadGoogleFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * 서비스 대표 OG 이미지 — 브랜드 마크 + us.tage 워드마크.
 *
 * 마크는 `lib/brand-mark.ts`의 벡터를 data URI로 넘긴다(Satori는 JSX 컴포넌트로
 * 넣은 SVG의 gradient/defs를 온전히 그리지 못해 <img>로 준다).
 * 워드마크의 가운뎃점은 글꼴 마침표가 아니라 원 요소다 — 화면의 `Wordmark`와 같은 모양.
 */
export default async function OgImage() {
  const fontData = await loadGoogleFont(`${TAGLINE}${SUB}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1f6f6f 0%, #2b8a8a 55%, #3aa3a0 100%)",
          color: "#ffffff",
          fontFamily: fontData ? "NotoSansKR" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori는 next/image를 쓰지 못한다 */}
          <img src={brandMarkDataUri()} width={132} height={132} alt="" />

          {/* us.tage — 가운뎃점을 스포트라이트처럼 살린 소문자 워드마크 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: -3,
            }}
          >
            <span>us</span>
            <span
              style={{
                width: 22,
                height: 22,
                margin: "0 10px",
                borderRadius: 999,
                background: "#ffffff",
              }}
            />
            <span>tage</span>
          </div>
        </div>

        {/* Satori는 Fragment를 flex 자식으로 제대로 배치하지 못한다 — 형제 div로 각각 둔다 */}
        {fontData && (
          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontSize: 38,
              fontWeight: 700,
              opacity: 0.95,
            }}
          >
            {TAGLINE}
          </div>
        )}
        {fontData && (
          <div
            style={{ display: "flex", marginTop: 14, fontSize: 28, opacity: 0.75 }}
          >
            {SUB}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "NotoSansKR", data: fontData, style: "normal", weight: 700 }]
        : undefined,
    }
  );
}
