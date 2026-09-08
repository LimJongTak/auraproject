"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

// Judged award labels are free text entered per-exhibition by an admin (see
// judge/[categoryId]/page.tsx's AWARD_PRESETS), so the numeric rank they type
// alongside it isn't guaranteed to sort 대상/최우수상/우수상 in the expected
// order. This gives the common labels a fixed display order; anything else
// (custom labels) falls back to sorting by that admin-entered rank, and 인기상
// is always last regardless.
const JUDGED_LABEL_ORDER = ["대상", "최우수상", "우수상"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
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
        .sort((a, b) => {
          const orderA = JUDGED_LABEL_ORDER.indexOf(a.label);
          const orderB = JUDGED_LABEL_ORDER.indexOf(b.label);
          if (orderA !== -1 || orderB !== -1) {
            return (orderA === -1 ? JUDGED_LABEL_ORDER.length : orderA) - (orderB === -1 ? JUDGED_LABEL_ORDER.length : orderB);
          }
          return a.minRank - b.minRank;
        });
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

  return (
    <div className={cn(!showHeading && "rounded-2xl border border-border bg-surface p-5 sm:p-6", className)}>
      {showHeading && (
        <Link href={`/contest/${category.id}`} className="text-sm font-bold text-primary hover:underline">
          {category.name}
        </Link>
      )}
      <div className={cn("flex items-center gap-1.5", showHeading && "mt-1")}>
        <Trophy size={showHeading ? 20 : 18} className="text-primary" />
        <h3 className={cn("font-extrabold", showHeading ? "text-xl" : "text-lg")}>수상 결과</h3>
      </div>

      {showCountdown && countdown && (
        <div className="mt-3">
          <p className="text-xs text-muted">발표까지</p>
          <p className={cn("mt-1 font-extrabold text-primary", showHeading ? "text-xl" : "text-2xl")}>
            {countdown.days}일 {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
          </p>
        </div>
      )}

      {groups.length > 0 && (
        <div className={cn("flex flex-col flex-wrap gap-6 sm:flex-row", showCountdown && "mt-5")}>
          {groups.map((group) => (
            <div key={group.key} className="sm:min-w-[200px] sm:flex-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                  group.variant === "popular" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                )}
              >
                {group.variant === "popular" ? <Heart size={12} /> : <Trophy size={12} />} {group.label}
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/exhibitions/${item.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-border transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          fill
                          sizes="(min-width: 1024px) 200px, 45vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                          이미지 없음
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5">
                      <p className="line-clamp-1 text-sm font-bold text-foreground transition group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted">
                        {category.teamSizeMax === 1 ? item.teamName : `팀 · ${item.teamName}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
