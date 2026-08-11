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
