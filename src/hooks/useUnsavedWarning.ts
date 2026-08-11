"use client";

import { useEffect } from "react";

/**
 * 작성 중인 내용이 있을 때 새로고침·탭 닫기·주소 직접 이동을 되돌릴 수 있게 확인창을 띄운다.
 * 브라우저가 문구를 정하므로 메시지는 지정할 수 없다.
 *
 * 한계: 앱 내부 링크 이동(Link/router.push)은 beforeunload가 잡지 못한다.
 * 그 경로는 각 화면이 직접 확인해야 한다(EventForm의 '취소' 버튼 참고).
 */
export function useUnsavedWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 구형 브라우저는 returnValue를 봐야 확인창을 띄운다
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
