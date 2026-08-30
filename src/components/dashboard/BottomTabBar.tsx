"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, House, Mic, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 모바일 하단 탭 — 홈 · 내 티켓 · 내 스테이지 · 마이페이지.
 *
 * 계정은 하나이고 주최자도 참석자가 될 수 있으므로 역할 전환 UI를 두지 않는다.
 * 주최 이력이 없어도 '내 스테이지' 탭을 숨기지 않고, 들어가면 빈 상태로 안내한다.
 * 데스크톱(sm 이상)에서는 Header의 탭 네비게이션을 쓴다.
 */
const TABS = [
  { href: "/dashboard", label: "홈", icon: House, exact: true },
  { href: "/dashboard/bookings", label: "내 티켓", icon: Ticket },
  { href: "/dashboard/events", label: "내 스테이지", icon: Mic },
  { href: "/dashboard/account", label: "마이페이지", icon: CircleUser },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card px-3 pt-2 pb-3 sm:hidden"
    >
      {TABS.map(({ href, label, icon: Icon, ...rest }) => {
        const exact = "exact" in rest && rest.exact;
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-3xl text-11 transition-colors",
              active
                ? "font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-5" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
