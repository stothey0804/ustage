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
import { LogOut, Mail, Settings, Ticket } from "lucide-react";

/** DropdownMenuContent portals itself and carries the panel styling. Align it
 *  to the trigger edge that keeps it on screen. */
export function AccountMenu() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">내 계정</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>seoyoung@example.com</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Ticket />내 예약
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Mail />
            이메일 변경
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            계정 설정
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
