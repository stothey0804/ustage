import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** DropdownMenuPortal moves the menu to document.body so it escapes clipping
 *  ancestors. DropdownMenuContent already wraps itself in one — this card
 *  shows the effect: the menu opens out of an overflow-hidden card. */
export function EscapesClippedParent() {
  return (
    <div className="h-24 w-[300px] max-w-full overflow-hidden rounded-2xl bg-muted p-3">
      <div className="flex items-center justify-between text-sm">
        <span>겨울밤의 소극장 콘서트</span>
        <DropdownMenu defaultOpen modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="메뉴">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem>스테이지 수정</DropdownMenuItem>
            <DropdownMenuItem>예매 링크 복사</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
