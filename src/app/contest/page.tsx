"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { subscribeCategories } from "@/lib/firestore/categories";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import { CONTEST_TYPES, type Category, type ContestType } from "@/types/models";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  before: { label: "접수 예정", className: "bg-blue-50 text-blue-600" },
  open: { label: "접수 중", className: "bg-green-50 text-green-600" },
  closed: { label: "접수 마감", className: "bg-surface text-muted" },
};

// Coarser than STATE_LABEL: contests not yet closed for submissions read as
// "진행 중" (ongoing) here, since that's the distinction visitors browsing
// the list actually care about — the before/open nuance still shows via the
// STATE_LABEL badge next to it.
type ContestPhase = "ongoing" | "ended";

const PHASE_LABEL: Record<ContestPhase, { label: string; className: string }> = {
  ongoing: { label: "진행 중", className: "bg-green-50 text-green-600" },
  ended: { label: "종료", className: "bg-surface text-muted" },
};

function getContestPhase(c: Category): ContestPhase {
  return getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt) === "closed" ? "ended" : "ongoing";
}

const FILTER_TABS: { key: "all" | ContestPhase; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "ongoing", label: "진행 중" },
  { key: "ended", label: "종료" },
];

export default function ContestPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [filter, setFilter] = useState<"all" | ContestPhase>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ContestType>("all");

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  const active = (categories ?? []).filter((c) => c.isActive);
  const phaseFiltered = filter === "all" ? active : active.filter((c) => getContestPhase(c) === filter);
  const visible = typeFilter === "all" ? phaseFiltered : phaseFiltered.filter((c) => c.contestType === typeFilter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "대회" }]} />

      <div className="mt-4">
        <h1 className="text-3xl font-extrabold">대회</h1>
        <p className="mt-1 text-sm text-muted">진행 중인 대회와 접수 기간을 확인하세요.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === tab.key ? "bg-primary text-white" : "bg-surface text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("all")}
          className={cn(
            "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
            typeFilter === "all"
              ? "border-primary bg-primary-light text-primary-dark"
              : "border-border text-muted hover:border-primary/40 hover:text-foreground"
          )}
        >
          전체 카테고리
        </button>
        {CONTEST_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
              typeFilter === t
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-border text-muted hover:border-primary/40 hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {categories === null &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}

        {categories !== null &&
          visible.map((c) => {
            const state = getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt);
            const phase = getContestPhase(c);
            return (
              <div key={c.id} className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6">
                <div>
                  {c.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt={c.name}
                      className="mb-4 aspect-[2/1] w-full rounded-xl object-cover"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold">{c.name}</h3>
                    {c.contestType && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                        {c.contestType}
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", PHASE_LABEL[phase].className)}>
                      {PHASE_LABEL[phase].label}
                    </span>
                    {phase === "ongoing" && (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATE_LABEL[state].className)}>
                        {STATE_LABEL[state].label}
                      </span>
                    )}
                  </div>
                  {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                  <p className="mt-2 text-xs text-muted">{formatDateRange(c.submissionOpenAt, c.submissionCloseAt)}</p>
                </div>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link href={`/contest/${c.id}`} className="flex-1">
                    <Button className="w-full">
                      자세히 보기 <ArrowRight size={14} />
                    </Button>
                  </Link>
                  <Link href="/exhibitions" className="flex-1">
                    <Button variant="outline" className="w-full">
                      전시물 보러가기
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
      </div>

      {categories !== null && visible.length === 0 && (
        <EmptyState
          title={
            filter === "ongoing"
              ? "진행 중인 대회가 없어요"
              : filter === "ended"
                ? "종료된 대회가 없어요"
                : "등록된 대회가 없어요"
          }
          description="새로운 대회가 열리면 여기에 표시돼요."
        />
      )}
    </div>
  );
}
