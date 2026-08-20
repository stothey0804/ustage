import { describe, expect, it } from "vitest";
import { bookingShareMeta } from "@/lib/og-share";

const fmt = (iso: string) => `[${iso}]`;
const base = {
  title: "겨울의 끝, 세 번째 무대",
  event_date: "2026-02-14T19:30:00+09:00",
  venue: "홍대 클럽",
  poster_url: null as string | null,
};

describe("bookingShareMeta", () => {
  it("포스터가 있으면 미리보기 이미지로 쓰고 정사각 카드를 고른다", () => {
    const meta = bookingShareMeta(
      { ...base, poster_url: "https://x.supabase.co/poster.jpg" },
      fmt,
    );
    expect(meta.imageUrl).toBe("https://x.supabase.co/poster.jpg");
    // 포스터는 세로라 큰 카드에서 잘린다
    expect(meta.twitterCard).toBe("summary");
  });

  it("포스터가 없으면 imageUrl을 넘기지 않는다 (루트 OG 이미지 상속)", () => {
    const meta = bookingShareMeta(base, fmt);
    // 빈 배열/빈 문자열을 주면 상속이 끊긴다 — 키 자체가 없어야 한다
    expect("imageUrl" in meta).toBe(false);
    expect(meta.twitterCard).toBe("summary_large_image");
  });

  it("공백뿐인 poster_url은 없는 것으로 본다", () => {
    expect("imageUrl" in bookingShareMeta({ ...base, poster_url: "   " }, fmt)).toBe(
      false,
    );
  });

  it("설명은 일시·장소로 만든다 (리치텍스트를 쓰지 않는다)", () => {
    const meta = bookingShareMeta(base, fmt);
    expect(meta.title).toBe(base.title);
    expect(meta.description).toBe("[2026-02-14T19:30:00+09:00] · 홍대 클럽");
  });
});
