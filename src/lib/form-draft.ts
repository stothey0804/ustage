/**
 * 폼 임시저장(초안) 직렬화 — 저장소는 브라우저 localStorage 하나뿐이다.
 *
 * 왜 서버가 아닌가: `events`의 NOT NULL(제목·일시·장소·가격·계좌·연락처·slug)이
 * "오픈된 스테이지에는 필수값이 있다"를 담보하고 있고, 부분 데이터를 events 행으로
 * 만들면 slug가 즉시 발급돼 `/e/<slug>`가 열리고 `booking_start` 도래 시 자동 오픈까지
 * 된다. 즉 미완성 스테이지가 공개되는 경로가 열린다. 그래서 초안은 DB에 넣지 않는다.
 *
 * 순수 함수로 분리해 만료·버전·손상된 값 처리를 테스트로 못 박는다.
 */

/** 저장 포맷 버전 — 폼 필드가 바뀌면 올린다(옛 초안은 폐기된다) */
export const DRAFT_VERSION = 1;

/** 30일이 지난 초안은 되살리지 않는다 */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 초안 키. 계정별로 분리해 공용 브라우저에서 다른 사람의 초안이 보이지 않게 한다.
 */
export function eventDraftKey(userId: string): string {
  return `ustage:event-draft:v${DRAFT_VERSION}:${userId}`;
}

export type StoredDraft<T> = {
  version: number;
  /** ISO 문자열 */
  savedAt: string;
  values: T;
};

export function serializeDraft<T>(values: T, savedAt: string): string {
  return JSON.stringify({ version: DRAFT_VERSION, savedAt, values });
}

/**
 * 저장된 문자열을 초안으로 복원. 되살릴 수 없으면 null.
 * (JSON 손상 / 버전 불일치 / 만료 / 값이 객체가 아님)
 */
export function parseDraft<T>(
  raw: string | null,
  opts: { now?: number; maxAgeMs?: number } = {}
): StoredDraft<T> | null {
  if (!raw) return null;

  const now = opts.now ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? DRAFT_MAX_AGE_MS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const draft = parsed as Partial<StoredDraft<unknown>>;
  if (draft.version !== DRAFT_VERSION) return null;
  if (typeof draft.savedAt !== "string") return null;
  if (!draft.values || typeof draft.values !== "object") return null;

  const savedAtMs = new Date(draft.savedAt).getTime();
  if (isNaN(savedAtMs)) return null;
  if (now - savedAtMs > maxAgeMs) return null;

  return {
    version: draft.version,
    savedAt: draft.savedAt,
    values: draft.values as T,
  };
}
