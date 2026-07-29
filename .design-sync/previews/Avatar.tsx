import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "ustage";

// Inline SVG data URI so the card never depends on the network.
const FACE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2f7f7c"/><circle cx="32" cy="25" r="11" fill="#e6f2f1"/><path d="M8 64c0-13 11-21 24-21s24 8 24 21z" fill="#e6f2f1"/></svg>`,
  );

export function Sizes() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>도</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>하</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithImage() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarImage src={FACE} alt="김서영" />
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src={FACE} alt="김서영" />
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarImage src={FACE} alt="김서영" />
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
    </div>
  );
}

/** AvatarBadge is absolutely positioned inside Avatar and sizes itself from
 *  the avatar's data-size — a checked-in marker in the ustage scan screen. */
export function WithBadge() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarImage src={FACE} alt="김서영" />
        <AvatarFallback>서</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar>
        <AvatarFallback>도</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    </div>
  );
}
