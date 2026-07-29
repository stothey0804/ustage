import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { ArrowDownUp } from "lucide-react";

/** Single-choice section. The group owns `value`; the items only carry their
 *  own `value`. */
export function SortOrder() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ArrowDownUp />
          정렬
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>명단 정렬</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value="recent">
          <DropdownMenuRadioItem value="recent">최근 예매순</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">이름순</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="status">입금 상태순</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
