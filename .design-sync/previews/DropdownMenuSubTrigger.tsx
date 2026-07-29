import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** The row that opens a nested menu. It renders its own trailing chevron and
 *  supports `inset` for alignment with checkable siblings. */
export function Default() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem>스테이지 수정</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>상태 변경</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>티켓 오픈</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>내보내기</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>엑셀</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Open, so the trigger shows its highlighted state. */
export function OpenState() {
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
          <DropdownMenuSubTrigger>상태 변경</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>티켓 오픈</DropdownMenuItem>
            <DropdownMenuItem>예매 마감</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
