import { describe, expect, it } from "vitest";
import { bookingShareMeta } from "@/lib/og-share";

const fmt = (iso: string) => `[${iso}]`;
const base = {
  title: "겨울의 끝, 세 번째 무대",
  event_date: "2026-02-14T19:30:00+09:00",
  venue: "홍대 클럽",
};

describe("bookingShareMeta", () => {
  it("제목은 그대로, 설명은 일시·장소로 만든다", () => {
    const meta = bookingShareMeta(base, fmt);
    expect(meta.title).toBe(base.title);
    // 리치텍스트(description)를 쓰지 않는다 — 태그가 섞여 미리보기에 부적합
    expect(meta.description).toBe("[2026-02-14T19:30:00+09:00] · 홍대 클럽");
  });

  it("이미지는 다루지 않는다 (파일 기반 opengraph-image가 우선하므로)", () => {
    const meta = bookingShareMeta(base, fmt);
    expect(Object.keys(meta).sort()).toEqual(["description", "title"]);
  });
});
