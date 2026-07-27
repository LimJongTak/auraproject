"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeAnnouncements } from "@/lib/firestore/announcements";
import type { Announcement } from "@/types/models";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";

function formatDate(ts: Announcement["createdAt"] | null): string {
  return ts ? ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
}

export default function NoticesPage() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    const unsub = subscribeAnnouncements(setAnnouncements);
    return () => unsub();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "공지사항" }]} />

      <div className="mt-4">
        <h1 className="text-3xl font-extrabold">공지사항</h1>
        <p className="mt-1 text-sm text-muted">사업단의 새로운 소식을 확인하세요.</p>
      </div>

      <div className="mt-8">
        {announcements === null &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 h-16 animate-pulse rounded-2xl bg-surface" />
          ))}

        {announcements !== null && announcements.length === 0 && (
          <EmptyState title="등록된 공지사항이 없어요" />
        )}

        {announcements !== null && announcements.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link href={`/notices/${a.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface">
                  <div className="flex min-w-0 items-center gap-3">
                    {a.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    )}
                    <p className="truncate font-medium">{a.title}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">{formatDate(a.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
