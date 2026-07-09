import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privateustage.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/", // 로그인 전용
          "/api/",
          "/auth/",
          "/e/", // 폐쇄형 예매 페이지 — 링크를 받은 사람만 접근하는 비공개 영역
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
