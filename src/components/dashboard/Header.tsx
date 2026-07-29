"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Mic, Ticket, UserCog } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

interface Props {
  userEmail: string | undefined;
}

/**
 * 데스크톱 상단 네비게이션.
 * 모바일 이동은 BottomTabBar가 담당하므로 여기서는 브랜드와 계정/로그아웃만 남긴다.
 */
const NAV_ITEMS = [
  { href: "/dashboard/events", label: "내 스테이지", icon: Mic },
  { href: "/dashboard/bookings", label: "내 티켓", icon: Ticket },
] as const;

export function Header({ userEmail }: Props) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1520px] items-center justify-between px-4 md:px-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandMark className="size-8" />
            <Wordmark className="text-xl" />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-3xl px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/account"
            className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <UserCog className="size-4" />
            {userEmail ?? "계정 설정"}
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
