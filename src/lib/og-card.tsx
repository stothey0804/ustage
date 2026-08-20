/**
 * 공유 미리보기 카드 레이아웃 — `app/e/[slug]/opengraph-image.tsx`가 쓴다.
 *
 * 데이터 조회와 그리기를 나눠, 카드 모양을 실제 예매 데이터 없이도 확인할 수 있게 한다.
 * Satori 제약 두 가지를 지켜야 한다: SVG는 data URI `<img>`로 넘기고,
 * Fragment는 flex 자식으로 배치되지 않으므로 쓰지 않는다.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const BRAND_BG =
  "linear-gradient(135deg, #1f6f6f 0%, #2b8a8a 55%, #3aa3a0 100%)";

/** us.tage 워드마크 — 가운뎃점은 글꼴 마침표가 아니라 원(화면의 Wordmark와 같은 모양) */
function Wordmark({ fontSize, opacity }: { fontSize: number; opacity: number }) {
  const dot = Math.round(fontSize * 0.21);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize,
        fontWeight: 700,
        opacity,
      }}
    >
      <span>us</span>
      <span
        style={{
          width: dot,
          height: dot,
          margin: `0 ${Math.round(dot * 0.45)}px`,
          borderRadius: 999,
          background: "#ffffff",
        }}
      />
      <span>tage</span>
    </div>
  );
}

export function BookingShareCard({
  title,
  subtitle,
  posterSrc,
  brandMarkSrc,
  fontFamily,
}: {
  title: string;
  subtitle: string;
  /** 포스터 data URI — 없으면 브랜드 마크만 보여준다 */
  posterSrc: string | null;
  brandMarkSrc: string;
  fontFamily: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: posterSrc ? 56 : 40,
        padding: "0 72px",
        background: BRAND_BG,
        color: "#ffffff",
        fontFamily,
      }}
    >
      {/* 포스터는 세로가 길어 1200×630을 채울 수 없다 — 전체가 보이게 담고(contain)
          옆에 정보를 둔다. 포스터가 없으면 빈 액자 대신 마크만 보여준다. */}
      {posterSrc ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 340,
            height: 470,
            flexShrink: 0,
            borderRadius: 24,
            background: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori는 next/image를 쓰지 못한다 */}
          <img
            src={posterSrc}
            alt=""
            width={340}
            height={470}
            style={{ objectFit: "contain" }}
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 위와 같은 이유
        <img src={brandMarkSrc} alt="" width={168} height={168} />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.22,
            letterSpacing: -1.5,
            // 긴 제목은 잘라낸다 — 카드 높이를 넘기면 아래 정보가 밀린다
            maxHeight: 216,
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 30,
            fontWeight: 700,
            opacity: 0.9,
          }}
        >
          {subtitle}
        </div>

        <div style={{ display: "flex", marginTop: 44 }}>
          <Wordmark fontSize={34} opacity={0.85} />
        </div>
      </div>
    </div>
  );
}
