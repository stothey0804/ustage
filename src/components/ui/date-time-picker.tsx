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
  /** 빈 문자열("")은 '미지정'을 뜻한다 — clearable일 때 지우기가 이 값을 넘긴다. */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 값을 비워 '미지정'으로 되돌릴 수 있게 한다. 필수 필드에서는 끈다. */
  clearable?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "날짜와 시간을 선택하세요",
  disabled,
  clearable = false,
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
            "w-full min-w-0 justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      {/* 모바일에서 잘리지 않게: 가로는 화면 폭, 세로는 화면 높이로 제한하고 안에서 스크롤한다
          (예전에는 overflow-hidden + 높이 제한이 없어 작은 화면에서 달력·확인 버튼이 잘렸다) */}
      <PopoverContent
        className="max-h-[min(70dvh,34rem)] w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-x-hidden overflow-y-auto overscroll-contain p-0"
        align="start"
        collisionPadding={8}
      >
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
        {/* 폼 안에서 쓰이므로 type="button"이 필수 — 기본값(submit)이면 클릭이 폼을 제출한다. */}
        <div className="flex gap-2 border-t p-2">
          {clearable && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="flex-1 text-muted-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              지우기
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
