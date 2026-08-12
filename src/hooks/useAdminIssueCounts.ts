"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { listAllInquiriesForAdmin } from "@/lib/firestore/inquiries";
import { listAllTeamsForAdmin } from "@/lib/firestore/teams";
import { listAllUsers } from "@/lib/firestore/users";
import { getLastSeen, markSeen } from "@/lib/utils/adminSeen";

const REFRESH_INTERVAL_MS = 60_000;

// href -> localStorage key, for admin pages that don't carry their own
// read/unread state and rely on a "seen as of last visit" watermark instead.
const WATERMARKED_ROUTES: Record<string, string> = {
  "/admin/applicants": "applicants",
  "/admin/users": "users",
};

export function useAdminIssueCounts(): Record<string, number> {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const entry = Object.entries(WATERMARKED_ROUTES).find(
      ([href]) => pathname === href || pathname.startsWith(href + "/")
    );
    if (entry) markSeen(entry[1]);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const applicantsSeenAt = getLastSeen("applicants");
      const usersSeenAt = getLastSeen("users");

      const [inquiries, teams, users] = await Promise.all([
        listAllInquiriesForAdmin(),
        listAllTeamsForAdmin(),
        listAllUsers(),
      ]);
      if (cancelled) return;

      setCounts({
        "/admin/inquiries": inquiries.filter((q) => q.status === "pending").length,
        "/admin/applicants": teams.filter((t) => (t.createdAt?.toMillis() ?? 0) > applicantsSeenAt).length,
        "/admin/users": users.filter((u) => (u.createdAt?.toMillis() ?? 0) > usersSeenAt).length,
      });
    }

    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  return counts;
}
