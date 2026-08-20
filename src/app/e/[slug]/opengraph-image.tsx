import { ImageResponse } from "next/og";

import { createClient } from "@/lib/supabase/server";
import { formatKST } from "@/lib/date";
import { brandMarkDataUri } from "@/lib/brand-mark";
import { BookingShareCard, OG_SIZE } from "@/lib/og-card";

export const alt = "예매 안내";
export const size = OG_SIZE;
export const contentType = "image/png";

/** 포스터를 그대로 싣기엔 큰 파일이 올 수 있어 상한을 둔다 */
const MAX_POSTER_BYTES = 6 * 1024 * 1024;

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
 * 포스터를 data URI로 가져온다.
 *
 * ImageResponse에 원격 URL을 그대로 주면 그 요청이 실패할 때 렌더 전체가 터져
 * **OG 이미지가 아예 없는 상태**가 된다. 미리 받아서 실패하면 null을 돌려주고
 * 브랜드 마크로 대체한다.
 */
async function loadPoster(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_POSTER_BYTES) return null;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * 예매 페이지 공유 미리보기.
 *
 * **이 파일이 필요한 이유**: 파일 기반 메타데이터가 `generateMetadata`보다 우선하므로,
 * 루트 `opengraph-image.tsx`가 있으면 페이지에서 `openGraph.images`로 포스터를 지정해도
 * 무시된다. 세그먼트에 파일을 두어야 그 경로에서 우선권을 가진다.
 *
 * 포스터는 세로가 길어 1200×630을 그대로 채울 수 없으므로, 브랜드 배경 위에
 * 포스터 전체를 담고(contain) 오른쪽에 제목·일시·장소를 둔다.
 */
export default async function BookingOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, event_date, venue, poster_url")
    .eq("slug", slug)
    .single();

  const title = event?.title ?? "어스테이지 예매";
  const subtitle = event
    ? `${formatKST(event.event_date)} · ${event.venue}`
    : "링크 하나로 예매부터 입장까지";

  const [fontData, poster] = await Promise.all([
    loadGoogleFont(`${title}${subtitle}예매 안내`),
    loadPoster(event?.poster_url ?? null),
  ]);

  return new ImageResponse(
    (
      <BookingShareCard
        title={title}
        subtitle={subtitle}
        posterSrc={poster}
        brandMarkSrc={brandMarkDataUri()}
        fontFamily={fontData ? "NotoSansKR" : "sans-serif"}
      />
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "NotoSansKR", data: fontData, style: "normal", weight: 700 }]
        : undefined,
    }
  );
}
