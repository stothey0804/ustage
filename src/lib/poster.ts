/** Supabase Storage 공개 URL 안에서 posters 버킷의 객체 경로가 시작되는 지점. */
const PUBLIC_MARKER = "/object/public/posters/";

/**
 * 포스터 공개 URL에서 Storage 객체 경로(`<userId>/<timestamp>.jpg`)를 뽑는다.
 * 우리 버킷의 URL이 아니면 null — 남의 URL이나 손으로 넣은 주소로 remove를 호출하지 않는다.
 * 삭제·교체 시 고아 파일을 지우는 쪽(서버 액션·폼)이 모두 이 함수를 쓴다.
 */
export function posterStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;

  const raw = url.slice(idx + PUBLIC_MARKER.length);
  if (!raw) return null;

  // 쿼리스트링(?t=…)이 붙어 오는 경우가 있어 잘라낸다
  const withoutQuery = raw.split(/[?#]/)[0];
  if (!withoutQuery) return null;

  try {
    const path = decodeURIComponent(withoutQuery);
    // 경로 탈출 방어 — 버킷 밖을 가리키는 값은 쓰지 않는다
    if (path.includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * 저장해도 되는 포스터 URL인가 — **우리 Supabase Storage의 posters 공개 URL만** 허용한다.
 *
 * `poster_url`은 서버 액션 인자라 폼을 거치지 않고 임의 문자열을 넣을 수 있고,
 * 공개 OG 라우트가 그 URL을 서버에서 fetch한다(SSRF). 업로드 결과만 통과시켜
 * 애초에 외부 주소가 저장되지 않게 막는다.
 *
 * 판정 기준은 Supabase URL 오리진 + posters 버킷 경로다. 환경변수가 없으면
 * (빌드·테스트 환경) 경로 형태만 확인한다.
 */
export function isAllowedPosterUrl(url: string | null | undefined): boolean {
  if (!url) return true; // 비어 있음 = 포스터 없음

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (!parsed.pathname.includes(PUBLIC_MARKER)) return false;
  if (posterStoragePath(url) === null) return false;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return true;
  try {
    return parsed.origin === new URL(base).origin;
  } catch {
    return true;
  }
}
