"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Trophy } from "lucide-react";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { useCountdownTimer } from "@/hooks/useCountdown";
import type { Category, Exhibition } from "@/types/models";
import { cn } from "@/lib/utils/cn";

interface AwardGroup {
  key: string;
  label: string;
  minRank: number;
  items: Exhibition[];
  variant: "judged" | "popular";
}

const POPULAR_LABEL = "인기상";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function CountdownUnit({ value, label, compact }: { value: string; label: string; compact: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-amber-400/30 bg-white/5",
        compact ? "min-w-14 px-2 py-2" : "min-w-20 px-3 py-3"
      )}
    >
      <span className={cn("font-black tabular-nums text-amber-300", compact ? "text-xl" : "text-3xl sm:text-4xl")}>
        {value}
      </span>
      <span className={cn("mt-0.5 font-medium text-slate-400", compact ? "text-[10px]" : "text-xs")}>{label}</span>
    </div>
  );
}

// Public "수상 결과" block for one contest. Judged awards (대상/최우수상/...,
// Exhibition.award) wait for Category.awardAnnounceAt to pass before showing
// anything — before that this only renders the countdown. 인기상
// (popularAwardRank) has its own separate reveal timing (the scheduled
// assignPopularAwards function) and isn't gated by awardAnnounceAt, so it can
// appear alongside a still-running countdown.
//
// Nothing is fetched at all for a contest with neither a countdown ever set
// nor a popular award ever assigned — worthFetching below — so dropping this
// on the home page once per category doesn't cost a read for every ordinary,
// awardless contest.
export function CategoryAwardResults({
  category,
  showHeading = false,
  className,
}: {
  category: Category;
  showHeading?: boolean;
  className?: string;
}) {
  const target = category.awardAnnounceAt?.toDate() ?? null;
  const countdown = useCountdownTimer(target);
  const judgedRevealed = !target || (countdown?.done ?? false);
  const showCountdown = !!target && !judgedRevealed;

  const worthFetching = !!category.awardAnnounceAt || !!category.popularAwardAssignedAt;
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);

  useEffect(() => {
    if (!worthFetching) return;
    listPublishedExhibitions({ categoryId: category.id, max: 500 }).then(setExhibitions);
  }, [worthFetching, category.id]);

  const groups = useMemo<AwardGroup[]>(() => {
    if (!exhibitions) return [];
    const result: AwardGroup[] = [];

    if (judgedRevealed) {
      const byLabel = new Map<string, Exhibition[]>();
      for (const e of exhibitions) {
        if (!e.award) continue;
        const list = byLabel.get(e.award.label) ?? [];
        list.push(e);
        byLabel.set(e.award.label, list);
      }
      const judgedGroups = Array.from(byLabel.entries())
        .map(([label, items]) => ({
          key: `judged:${label}`,
          label,
          minRank: Math.min(...items.map((i) => i.award!.rank)),
          items: [...items].sort((a, b) => a.award!.rank - b.award!.rank || a.title.localeCompare(b.title)),
          variant: "judged" as const,
        }))
        .sort((a, b) => a.minRank - b.minRank);
      result.push(...judgedGroups);
    }

    const popularItems = exhibitions
      .filter((e) => e.popularAwardRank)
      .sort((a, b) => a.popularAwardRank! - b.popularAwardRank!);
    if (popularItems.length > 0) {
      result.push({ key: "popular", label: POPULAR_LABEL, minRank: 0, items: popularItems, variant: "popular" });
    }

    return result;
  }, [exhibitions, judgedRevealed]);

  if (!worthFetching || (!showCountdown && groups.length === 0)) return null;

  const compact = showHeading;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl ring-1 ring-amber-400/20",
        compact ? "p-6" : "p-8 sm:p-10",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
      />

      <div className="relative">
        {showHeading && (
          <Link
            href={`/contest/${category.id}`}
            className="text-xs font-bold uppercase tracking-wider text-amber-300 hover:underline"
          >
            {category.name}
          </Link>
        )}
        <div className={cn("flex items-center gap-3", showHeading && "mt-2")}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-900 shadow-lg shadow-amber-500/30",
              compact ? "h-9 w-9" : "h-12 w-12"
            )}
          >
            <Trophy size={compact ? 18 : 24} />
          </span>
          <div>
            <h3 className={cn("font-extrabold tracking-tight", compact ? "text-lg" : "text-2xl sm:text-3xl")}>
              수상 결과
            </h3>
            {!compact && <p className="mt-0.5 text-sm text-slate-400">{category.name}의 영광의 수상자들</p>}
          </div>
        </div>

        {showCountdown && countdown && (
          <div className={cn(compact ? "mt-4" : "mt-8")}>
            <p className={cn("font-semibold text-slate-400", compact ? "text-[11px]" : "text-sm")}>
              결과 발표까지
            </p>
            <div className={cn("mt-2 flex flex-wrap gap-2", compact ? "" : "gap-3")}>
              <CountdownUnit value={String(countdown.days)} label="일" compact={compact} />
              <CountdownUnit value={pad(countdown.hours)} label="시" compact={compact} />
              <CountdownUnit value={pad(countdown.minutes)} label="분" compact={compact} />
              <CountdownUnit value={pad(countdown.seconds)} label="초" compact={compact} />
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div className={cn("flex flex-col", compact ? "gap-4" : "gap-6", showCountdown && (compact ? "mt-5" : "mt-8"))}>
            {groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full",
                      compact ? "h-5 w-5" : "h-6 w-6",
                      group.variant === "popular" ? "bg-rose-400/20 text-rose-300" : "bg-amber-400/20 text-amber-300"
                    )}
                  >
                    {group.variant === "popular" ? (
                      <Heart size={compact ? 11 : 13} />
                    ) : (
                      <Trophy size={compact ? 11 : 13} />
                    )}
                  </span>
                  <p className={cn("font-bold", compact ? "text-sm" : "text-base", "text-white")}>{group.label}</p>
                </div>
                <ul className={cn("mt-2 flex flex-col gap-2", !compact && "mt-3")}>
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition hover:bg-white/10"
                    >
                      <Link
                        href={`/exhibitions/${item.id}`}
                        className={cn("font-bold text-white hover:text-amber-300", compact ? "text-sm" : "text-base")}
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {category.teamSizeMax === 1 ? "신청자" : "팀"} · {item.teamName}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
