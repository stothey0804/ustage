"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  parseDraft,
  serializeDraft,
  type StoredDraft,
} from "@/lib/form-draft";

interface Options<T> {
  /** localStorage 키 — 계정별로 갈라야 한다(`lib/form-draft.ts`의 eventDraftKey) */
  storageKey: string;
  /** 현재 폼 값 — 바뀔 때마다 디바운스해서 저장한다 */
  values: T;
  /**
   * 저장할지 여부. 보통 `isDirty`를 넘긴다 — 손대지 않은 폼을 저장하면
   * 다음 방문에 빈 초안 복구 배너가 뜬다.
   */
  enabled: boolean;
  /** 저장 디바운스(ms) */
  delayMs?: number;
}

/**
 * 폼 값을 브라우저에 자동 저장하고, 마운트 시점의 초안을 돌려준다.
 *
 * 마운트 때 한 번만 읽는다 — 저장은 이 훅이 하므로 다시 읽으면 방금 쓴 값이
 * 복구 배너로 되돌아온다. 저장 실패(용량 초과·프라이빗 모드)는 무시한다:
 * 임시저장은 편의 기능이고, 실패해도 작성 자체를 막아선 안 된다.
 */
export function useFormDraft<T extends object>({
  storageKey,
  values,
  enabled,
  delayMs = 2000,
}: Options<T>): { restored: StoredDraft<T> | null; clear: () => void } {
  const [restored, setRestored] = useState<StoredDraft<T> | null>(null);
  const loadedRef = useRef(false);

  // 마운트 시 1회 읽기
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      setRestored(parseDraft<T>(window.localStorage.getItem(storageKey)));
    } catch {
      // 접근 자체가 막힌 환경(프라이빗 모드 등) — 초안 없이 진행
    }
  }, [storageKey]);

  // 값이 바뀌면 디바운스 저장
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          serializeDraft(values, new Date().toISOString())
        );
      } catch {
        // 용량 초과 등 — 조용히 넘어간다
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [storageKey, values, enabled, delayMs]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // 무시
    }
    setRestored(null);
  }, [storageKey]);

  return { restored, clear };
}
