import { describe, expect, it } from "vitest";
import { posterStoragePath } from "@/lib/poster";

const BASE =
  "https://abcdefgh.supabase.co/storage/v1/object/public/posters/";

describe("posterStoragePath", () => {
  it("공개 URL에서 객체 경로를 뽑는다", () => {
    expect(posterStoragePath(`${BASE}user-1/1754899200000.jpg`)).toBe(
      "user-1/1754899200000.jpg",
    );
  });

  it("퍼센트 인코딩과 쿼리스트링을 정리한다", () => {
    expect(posterStoragePath(`${BASE}user%201/poster.jpg?t=123`)).toBe(
      "user 1/poster.jpg",
    );
  });

  it("우리 버킷 URL이 아니면 null", () => {
    expect(posterStoragePath(null)).toBeNull();
    expect(posterStoragePath("")).toBeNull();
    expect(posterStoragePath("https://example.com/poster.jpg")).toBeNull();
    // 다른 버킷
    expect(
      posterStoragePath(
        "https://abcdefgh.supabase.co/storage/v1/object/public/avatars/a.jpg",
      ),
    ).toBeNull();
    // 경로가 비어 있음
    expect(posterStoragePath(BASE)).toBeNull();
  });

  it("경로 탈출은 거부한다", () => {
    expect(posterStoragePath(`${BASE}../avatars/a.jpg`)).toBeNull();
    expect(posterStoragePath(`${BASE}%2E%2E/avatars/a.jpg`)).toBeNull();
  });
});
