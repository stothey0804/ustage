import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "어스테이지 — 비공개 모임 예매 · 입장 시스템",
    short_name: "어스테이지",
    description:
      "비공개 링크로 예매를 받고, 입금을 확인하면 QR 티켓이 메일로 나가고, 당일에는 그 QR로 입장시킵니다.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5fafa",
    theme_color: "#2b8a8a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
