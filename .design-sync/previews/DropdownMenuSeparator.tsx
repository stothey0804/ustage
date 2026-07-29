import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** A full-bleed hairline that splits a menu into sections — most often before
 *  the destructive action. */
export function BetweenSections() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem>스테이지 수정</DropdownMenuItem>
        <DropdownMenuItem>예매 링크 복사</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>입장 확인</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
