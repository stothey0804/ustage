import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { MoreHorizontal } from "lucide-react";

/** DropdownMenuGroup adds no visuals — it groups items semantically so a
 *  DropdownMenuLabel names them for assistive tech. */
export function TwoGroups() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="메뉴">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>스테이지</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>수정</DropdownMenuItem>
          <DropdownMenuItem>예매 링크 복사</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>예매</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>명단 내려받기</DropdownMenuItem>
          <DropdownMenuItem>입장 확인</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
