import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";

/** Default, destructive, inset and disabled items in one menu. `variant`
 *  handles the destructive tint — don't hand-colour the text. */
export function AllVariants() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem>
          <Pencil />
          스테이지 수정
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share2 />
          예매 링크 복사
        </DropdownMenuItem>
        <DropdownMenuItem inset>들여쓴 항목</DropdownMenuItem>
        <DropdownMenuItem disabled>예매 마감 후 수정 불가</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
