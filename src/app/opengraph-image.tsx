import { ImageResponse } from "next/og";

export const alt = "어스테이지 — 소규모 공연 예매 · QR 입장 시스템";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "어스테이지";
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

export default async function OgImage() {
  const fontData = await loadGoogleFont(`${TITLE}${TAGLINE}${SUB}UStage`);

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
          background: "linear-gradient(135deg, #1f6f6f 0%, #2b8a8a 55%, #3aa3a0 100%)",
          color: "#ffffff",
          fontFamily: fontData ? "NotoSansKR" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          {/* 브랜드 마크: 무대 위 스포트라이트 모티프 */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 32,
              background: "rgba(255,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            US
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
              {fontData ? TITLE : "UStage"}
            </div>
          </div>
        </div>

        {fontData && (
          <div
            style={{
              marginTop: 36,
              fontSize: 38,
              fontWeight: 700,
              opacity: 0.95,
            }}
          >
            {TAGLINE}
          </div>
        )}
        {fontData && (
          <div style={{ marginTop: 14, fontSize: 28, opacity: 0.75 }}>
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
