"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Calendar, Ticket, ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

interface Props {
  userEmail: string | undefined;
}

const NAV_ITEMS = [
  { href: "/dashboard/events", label: "내 스테이지", icon: Calendar },
  { href: "/dashboard/bookings", label: "내 예약", icon: Ticket },
] as const;

export function Header({ userEmail }: Props) {
  const pathname = usePathname();
  const activeItem =
    NAV_ITEMS.find(({ href }) => pathname.startsWith(href)) ?? NAV_ITEMS[0];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandMark className="size-8" />
            <Wordmark className="text-xl" />
          </Link>
          {/* 모바일: 드롭다운 */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <activeItem.icon className="size-4" />
                  {activeItem.label}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link
                      href={href}
                      className={cn(
                        pathname.startsWith(href) && "bg-muted font-medium",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* PC: 탭 */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
          {userEmail ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
          ) : null}
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
