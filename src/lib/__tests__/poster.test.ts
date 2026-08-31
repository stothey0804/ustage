import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAllowedPosterUrl, posterStoragePath } from "@/lib/poster";

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

describe("isAllowedPosterUrl", () => {
  const BASE = "https://abcd.supabase.co";

  // 오리진 대조가 동작하려면 프로젝트 URL이 있어야 한다 (없으면 경로 형태만 본다)
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const ok = `${BASE}/storage/v1/object/public/posters/user-1/1.jpg`;

  it("우리 Storage의 posters 공개 URL만 허용한다", () => {
    expect(isAllowedPosterUrl(ok)).toBe(true);
    expect(isAllowedPosterUrl(`${ok}?t=123`)).toBe(true);
  });

  it("비어 있으면 허용한다 (포스터 없음)", () => {
    expect(isAllowedPosterUrl(null)).toBe(true);
    expect(isAllowedPosterUrl("")).toBe(true);
  });

  it("외부 주소·내부망 주소를 막는다 (OG 라우트의 서버 fetch가 SSRF가 된다)", () => {
    expect(isAllowedPosterUrl("http://169.254.169.254/latest/meta-data/")).toBe(
      false
    );
    expect(isAllowedPosterUrl("http://10.0.0.5:8080/x.jpg")).toBe(false);
    expect(isAllowedPosterUrl("https://evil.example/x.jpg")).toBe(false);
  });

  it("posters 버킷이 아니거나 URL이 아니면 막는다", () => {
    expect(
      isAllowedPosterUrl(`${BASE}/storage/v1/object/public/private/x.jpg`)
    ).toBe(false);
    expect(isAllowedPosterUrl("not a url")).toBe(false);
    expect(isAllowedPosterUrl("/posters/x.jpg")).toBe(false);
  });

  it("다른 Supabase 프로젝트의 URL도 막는다", () => {
    expect(
      isAllowedPosterUrl(
        "https://other.supabase.co/storage/v1/object/public/posters/a/1.jpg"
      )
    ).toBe(false);
  });
});
