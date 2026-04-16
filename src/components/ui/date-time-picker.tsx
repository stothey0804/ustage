"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  /** "YYYY-MM-DDTHH:mm" 형식의 문자열 (로컬 시간 기준) */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "날짜와 시간을 선택하세요",
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // value에서 날짜/시간 파싱
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const timeStr = value?.slice(11, 16) ?? ""; // "HH:mm"

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const dateStr = format(day, "yyyy-MM-dd");
    const time = timeStr || "00:00";
    onChange(`${dateStr}T${time}`);
    // 날짜 선택 시 팝오버 유지 (시간도 설정할 수 있도록)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = e.target.value;
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      onChange(`${dateStr}T${time}`);
    } else {
      // 날짜 미선택 상태에서 시간만 입력 — 오늘 날짜 기준으로 설정
      const today = format(new Date(), "yyyy-MM-dd");
      onChange(`${today}T${time}`);
    }
  }

  const displayValue = selectedDate
    ? format(selectedDate, "yyyy년 M월 d일 (EEE) ", { locale: ko }) +
      (timeStr ? timeStr.replace(":", "시 ") + "분" : "")
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal truncate",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          locale={ko}
          initialFocus
        />
        <div className="border-t p-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            시간
          </label>
          <Input
            type="time"
            value={timeStr}
            onChange={handleTimeChange}
            className="w-full"
          />
        </div>
        <div className="border-t p-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
