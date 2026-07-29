import { Avatar, AvatarFallback, AvatarImage } from "ustage";

const FACE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2f7f7c"/><circle cx="32" cy="25" r="11" fill="#e6f2f1"/><path d="M8 64c0-13 11-21 24-21s24 8 24 21z" fill="#e6f2f1"/></svg>`,
  );

/** AvatarImage only ever renders inside Avatar — it is a radix Image that
 *  swaps itself out for AvatarFallback while loading or on error. */
export function Loaded() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarImage src={FACE} alt="김서영" />
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">이미지 로드 성공</span>
    </div>
  );
}

/** A broken src falls through to the fallback rather than showing a torn image. */
export function BrokenSrcFallsBack() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarImage src="/does-not-exist.png" alt="박도현" />
        <AvatarFallback>도</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">로드 실패 → AvatarFallback</span>
    </div>
  );
}
