import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** The nested panel. Same item vocabulary as DropdownMenuContent — it just
 *  flies out beside its SubTrigger instead of below the root trigger. */
export function OpenSubmenu() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem>스테이지 수정</DropdownMenuItem>
        <DropdownMenuSub open>
          <DropdownMenuSubTrigger>명단 내보내기</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>엑셀 (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem>CSV</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>클립보드로 복사</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
