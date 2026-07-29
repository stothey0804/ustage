import { Avatar, AvatarBadge, AvatarFallback } from "ustage";
import { Check } from "lucide-react";

/** AvatarBadge is positioned against its Avatar parent and takes its size from
 *  the avatar's `size` — it renders nothing meaningful on its own. */
export function AcrossSizes() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>서</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar>
        <AvatarFallback>도</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>하</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    </div>
  );
}

/** With an icon child — only shown at default/lg, hidden at sm by design. */
export function WithIcon() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        <AvatarFallback>서</AvatarFallback>
        <AvatarBadge>
          <Check />
        </AvatarBadge>
      </Avatar>
      <Avatar>
        <AvatarFallback>도</AvatarFallback>
        <AvatarBadge>
          <Check />
        </AvatarBadge>
      </Avatar>
    </div>
  );
}
