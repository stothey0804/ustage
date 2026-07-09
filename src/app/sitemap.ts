import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

// 공개 마케팅 페이지만 포함 — 이벤트 페이지(/e/*)는 폐쇄형이라 제외
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/guide`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
