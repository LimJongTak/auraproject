"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, LayoutGrid, MessageCircle, User, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const MYPAGE_NAV_ITEMS = [
  { href: "/mypage", label: "내 정보", icon: User },
  { href: "/mypage/mileage", label: "마일리지", icon: Coins },
  { href: "/mypage/teams", label: "내 팀", icon: Users },
  { href: "/mypage/exhibitions", label: "내 게시글", icon: LayoutGrid },
  { href: "/mypage/inquiries", label: "내 문의", icon: MessageCircle },
];

export function MyPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-4xl items-start gap-8 px-4 py-8 lg:py-10">
      <aside className="hidden w-56 shrink-0 lg:top-24 lg:block lg:sticky nav:top-32">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">마이페이지</p>
        <nav className="mt-3 flex flex-col gap-0.5">
          {MYPAGE_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-primary-light text-primary-dark"
                    : "text-foreground/70 hover:bg-surface hover:text-foreground"
                )}
              >
                <item.icon size={17} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {MYPAGE_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  active
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                )}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
