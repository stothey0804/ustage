import { MapPin } from "lucide-react";

interface VenueMapLinksProps {
  address: string;
}

export function VenueMapLinks({ address }: VenueMapLinksProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 text-sm">
        <MapPin className="size-4 text-muted-foreground shrink-0" />
        <span className="flex-1">{address}</span>
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
