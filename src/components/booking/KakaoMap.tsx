"use client";

import { useEffect, useRef } from "react";

interface KakaoMapProps {
  lat: number;
  lng: number;
  name: string;
}

export function KakaoMap({ lat, lng, name }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!kakaoKey || !containerRef.current) return;

    const src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`;

    function init() {
      window.kakao.maps.load(() => {
        if (!containerRef.current) return;
        initialized.current = true;

        const position = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: position,
          level: 3,
        });

        const marker = new window.kakao.maps.Marker({ position });
        marker.setMap(map);

        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${name}</div>`,
        });
        infowindow.open(map, marker);
      });
    }

    if (document.querySelector(`script[src="${src}"]`)) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = src;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, [lat, lng, name]);

  return (
    <div
      ref={containerRef}
      className="w-full h-48 sm:h-64 rounded-lg border overflow-hidden"
    />
  );
}
