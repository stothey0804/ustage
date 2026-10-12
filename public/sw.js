// v3: 캐시 대상을 정적 파일로만 좁혔다. v2까지는 페이지 HTML·RSC까지 저장해서
// 로그아웃 뒤에도 네트워크가 끊기면 이전 계정의 대시보드(이메일·예매 명단)가 그대로 떴다.
// 이름을 바꾸면 activate에서 예전 캐시가 지워진다.
const CACHE_NAME = "ustage-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

// 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * 사용자 데이터가 없는 정적 파일만 캐시한다(allowlist).
 * 페이지 이동(navigate)·RSC 페이로드·API는 절대 저장하지 않는다 — 로그인 사용자의
 * 화면이 캐시에 남으면 로그아웃·계정 전환 후에도 오프라인 폴백으로 노출된다.
 */
function isCacheable(request) {
  if (request.method !== "GET" || request.mode === "navigate") return false;
  if (request.headers.get("RSC")) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.searchParams.has("_rsc")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(?:png|svg|ico|webp|jpg|jpeg|woff2?)$/.test(url.pathname)
  );
}

// 네트워크 우선, 실패 시 캐시 폴백 — 정적 파일만
self.addEventListener("fetch", (event) => {
  if (!isCacheable(event.request)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached ?? Response.error())
      )
  );
});
