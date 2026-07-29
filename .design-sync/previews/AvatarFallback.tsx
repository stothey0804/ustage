import { Avatar, AvatarFallback } from "ustage";
import { User } from "lucide-react";

/** The fallback is what most ustage avatars actually show — attendees have no
 *  profile image, so it carries the initial. */
export function Initials() {
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

export function IconFallback() {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>
          <User className="size-4" />
        </AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>
          <User className="size-5" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
