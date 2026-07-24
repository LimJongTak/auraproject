"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { subscribeCategories } from "@/lib/firestore/categories";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import type { Category } from "@/types/models";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  before: { label: "접수 예정", className: "bg-blue-50 text-blue-600" },
  open: { label: "접수 중", className: "bg-green-50 text-green-600" },
  closed: { label: "접수 마감", className: "bg-surface text-muted" },
};

export default function ContestPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  const active = (categories ?? []).filter((c) => c.isActive);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "대회" }]} />

      <div className="mt-4">
        <h1 className="text-3xl font-extrabold">대회</h1>
        <p className="mt-1 text-sm text-muted">진행 중인 대회와 접수 기간을 확인하세요.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {categories === null &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}

        {categories !== null &&
          active.map((c) => {
            const state = getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt);
            return (
              <div key={c.id} className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{c.name}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATE_LABEL[state].className)}>
                      {STATE_LABEL[state].label}
                    </span>
                  </div>
                  {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                  <p className="mt-2 text-xs text-muted">{formatDateRange(c.submissionOpenAt, c.submissionCloseAt)}</p>
                </div>
                <Link href="/exhibitions" className="mt-6">
                  <Button variant="outline" className="w-full">
                    전시물 보러가기 <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            );
          })}
      </div>

      {categories !== null && active.length === 0 && (
        <EmptyState title="진행 중인 대회가 없어요" description="새로운 대회가 열리면 여기에 표시돼요." />
      )}
    </div>
  );
}
