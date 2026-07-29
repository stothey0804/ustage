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
import { Filter } from "lucide-react";

/** Selected, unselected and disabled radio items. They only work inside a
 *  DropdownMenuRadioGroup, which holds the current value. */
export function States() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Filter />
          상태 필터
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>입금 상태</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value="confirmed">
          <DropdownMenuRadioItem value="all">전체</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="confirmed">입금완료</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="pending">입금대기</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="cancelled" disabled>
            취소 (없음)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
