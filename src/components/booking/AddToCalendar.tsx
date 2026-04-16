"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToCalendarProps {
  title: string;
  date: string; // ISO string
  venue: string;
  venueAddress?: string;
}

function toICSDate(isoStr: string): string {
  // UTC 기준 "YYYYMMDDTHHMMSSZ" 형식
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function AddToCalendar({
  title,
  date,
  venue,
  venueAddress,
}: AddToCalendarProps) {
  function handleClick() {
    const start = toICSDate(date);
    // 기본 2시간 이벤트
    const endDate = new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000);
    const end = toICSDate(endDate.toISOString());
    const location = venueAddress || venue;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ustage//NONSGML v1.0//EN",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `LOCATION:${location}`,
      `DESCRIPTION:어스테이지에서 예매한 공연입니다.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="gap-1.5"
    >
      <CalendarPlus className="size-4" />
      캘린더에 저장
    </Button>
  );
}
