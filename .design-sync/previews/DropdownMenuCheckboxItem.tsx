import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ustage";
import { SlidersHorizontal } from "lucide-react";

/** Multi-select filters. The check indicator is built in — the child is just
 *  the label. */
export function ColumnFilters() {
  return (
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal />
          표시 항목
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>명단에 표시할 항목</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>입금자명</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>입금 예상 시간</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>이메일</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem disabled>커스텀 답변</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
