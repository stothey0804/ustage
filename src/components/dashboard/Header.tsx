"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Calendar, Ticket, ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
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
  { href: "/dashboard/events", label: "내 이벤트", icon: Calendar },
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
            <span className="text-lg font-bold tracking-tight text-primary">
              어스테이지
            </span>
          </Link>
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
