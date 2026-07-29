import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "ustage";
import { Users } from "lucide-react";

/** The overflow chip that closes an AvatarGroup. It sizes itself from the
 *  group's avatars, so it belongs inside AvatarGroup, not on its own. */
export function OverflowCount() {
  return (
    <div className="flex flex-col gap-4">
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>서</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>도</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+15</AvatarGroupCount>
      </AvatarGroup>
      <AvatarGroup>
        <Avatar size="sm">
          <AvatarFallback>서</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>도</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}

export function IconCount() {
  return (
    <AvatarGroup>
      <Avatar size="lg">
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>도</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>
        <Users />
      </AvatarGroupCount>
    </AvatarGroup>
  );
}
