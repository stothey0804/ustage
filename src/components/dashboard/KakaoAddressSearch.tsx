"use client";

import { useCallback, useRef } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/types/kakao.d.ts";

interface KakaoAddressSearchProps {
  onSelect: (data: {
    venue: string;
    venue_address: string;
    venue_lat: number;
    venue_lng: number;
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

      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

      // 2. Kakao Maps SDK 로드 (좌표 변환용)
      if (kakaoKey) {
        await loadScript(
          `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`
        );
      }

      // 3. 주소 검색 팝업
      new window.daum.Postcode({
        oncomplete(data) {
          const address = data.roadAddress || data.jibunAddress;
          const displayName = data.buildingName
            ? `${address} (${data.buildingName})`
            : address;

          // 좌표 변환 시도
          if (kakaoKey && window.kakao?.maps) {
            window.kakao.maps.load(() => {
              const geocoder = new window.kakao.maps.services.Geocoder();
              geocoder.addressSearch(address, (result, status) => {
                if (
                  status === window.kakao.maps.services.Status.OK &&
                  result.length > 0
                ) {
                  onSelect({
                    venue: displayName,
                    venue_address: address,
                    venue_lng: parseFloat(result[0].x),
                    venue_lat: parseFloat(result[0].y),
                  });
                } else {
                  // 좌표 변환 실패 — 주소만 저장
                  onSelect({
                    venue: displayName,
                    venue_address: address,
                    venue_lat: 0,
                    venue_lng: 0,
                  });
                }
              });
            });
          } else {
            // 카카오 키 없음 — 주소만 저장
            onSelect({
              venue: displayName,
              venue_address: address,
              venue_lat: 0,
              venue_lng: 0,
            });
          }
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
