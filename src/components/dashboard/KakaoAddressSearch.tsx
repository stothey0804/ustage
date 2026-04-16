"use client";

import { useCallback, useRef } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/types/kakao.d.ts";

interface KakaoAddressSearchProps {
  onSelect: (data: {
    venue: string;
    venue_address: string;
  }) => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function KakaoAddressSearch({ onSelect }: KakaoAddressSearchProps) {
  const loadingRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      // 1. Daum Postcode 스크립트 로드
      await loadScript(
        "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      );

      // Daum Postcode 주소 검색 (API 키 불필요)
      new window.daum.Postcode({
        oncomplete(data) {
          const address = data.roadAddress || data.jibunAddress;
          const displayName = data.buildingName
            ? `${address} (${data.buildingName})`
            : address;

          onSelect({
            venue: displayName,
            venue_address: address,
          });
        },
      }).open();
    } catch (err) {
      console.error("[KakaoAddressSearch]", err);
    } finally {
      loadingRef.current = false;
    }
  }, [onSelect]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="shrink-0"
    >
      <MapPin className="size-4 mr-1" />
      주소 검색
    </Button>
  );
}
