"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Gavel,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  PanelRight,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/banners", label: "배너 관리", icon: CalendarClock },
  { href: "/admin/categories", label: "카테고리 관리", icon: LayoutGrid },
  { href: "/admin/applicants", label: "신청자 관리", icon: ClipboardList },
  { href: "/admin/exhibitions", label: "게시물 관리", icon: ShieldCheck },
  { href: "/judge", label: "심사 / 시상 관리", icon: Gavel },
  { href: "/admin/notices", label: "공지사항 관리", icon: Megaphone },
  { href: "/admin/inquiries", label: "문의 관리", icon: MessageSquare },
  { href: "/admin/users", label: "사용자 관리", icon: Users2 },
  { href: "/admin/analytics", label: "방문자 통계", icon: BarChart3 },
  { href: "/admin/quicklinks", label: "퀵메뉴 관리", icon: PanelRight },
];

// Shared by both /admin/* pages (via app/admin/layout.tsx) and /judge/* pages
// (via app/judge/layout.tsx, admin-only) so the sidebar doesn't disappear
// just because 심사/시상 관리 happens to live outside the /admin route tree.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-7xl items-start gap-8 px-4 py-8 lg:py-10">
      <aside className="hidden w-60 shrink-0 lg:top-24 lg:block lg:sticky nav:top-32">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">관리자 메뉴</p>
        <nav className="mt-3 flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
