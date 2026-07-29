import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ustage";
import { ChevronDown, MoreHorizontal } from "lucide-react";

/** `asChild` so the trigger is a real Button — the button's `aria-expanded`
 *  styling hooks are what give it the open look. */
export function IconTrigger() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="더보기">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>수정</DropdownMenuItem>
        <DropdownMenuItem>삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LabelledTrigger() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          상태 변경
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>티켓 오픈</DropdownMenuItem>
        <DropdownMenuItem>예매 마감</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
