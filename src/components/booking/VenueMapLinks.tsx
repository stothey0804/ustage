import { MapPin } from "lucide-react";

import { extraAddress } from "@/lib/venue";

interface VenueMapLinksProps {
  /** 주최자가 입력한 장소 — 건물명·층수 등이 붙어 있으므로 이것을 먼저 보여준다 */
  venue: string;
  /** 주소 검색 결과 — 지도 검색어로 쓴다 */
  address: string;
}

export function VenueMapLinks({ venue, address }: VenueMapLinksProps) {
  const extra = extraAddress(venue, address);
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-start gap-2 px-4 py-3 text-sm">
        <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 break-words">
          <p>{venue || address}</p>
          {extra && (
            <p className="mt-0.5 text-xs text-muted-foreground">{extra}</p>
          )}
        </div>
      </div>
      <div className="flex border-t divide-x">
        <a
          href={`https://map.kakao.com/link/search/${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 text-center text-xs text-primary hover:bg-muted/50 transition-colors"
        >
          카카오맵
        </a>
        <a
          href={`https://map.naver.com/p/search/${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 text-center text-xs text-primary hover:bg-muted/50 transition-colors"
        >
          네이버지도
        </a>
      </div>
    </div>
  );
}
