import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "어스테이지 — 소규모 공연 예매 · 입장 시스템",
    short_name: "어스테이지",
    description:
      "공연자가 링크를 공유하면, 참석자는 그 링크로만 예매할 수 있어요. QR로 입장까지 한 번에.",
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
