import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** A non-interactive caption at the top of a menu or over a group. It renders
 *  only inside DropdownMenuContent. */
export function SectionCaptions() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>seoyoung@example.com</DropdownMenuLabel>
        <DropdownMenuItem>내 예약</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>스테이지</DropdownMenuLabel>
        <DropdownMenuItem>새 스테이지</DropdownMenuItem>
        <DropdownMenuItem inset>가져오기</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
