import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "ustage";

/** Overlapping stack of attendees, with the overflow count as the last item. */
export function AttendeeStack() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>서</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>도</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>하</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+15</AvatarGroupCount>
    </AvatarGroup>
  );
}

/** The group reads the child avatars' size, so sizing is set per-avatar. */
export function Sizes() {
  return (
    <div className="flex flex-col gap-4">
      <AvatarGroup>
        <Avatar size="sm">
          <AvatarFallback>서</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>도</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+8</AvatarGroupCount>
      </AvatarGroup>
      <AvatarGroup>
        <Avatar size="lg">
          <AvatarFallback>서</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>도</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+8</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}
