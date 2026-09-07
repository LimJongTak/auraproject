"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeCategories } from "@/lib/firestore/categories";
import { subscribeHomeLayout } from "@/lib/firestore/homeLayout";
import { redactUnannouncedAwards } from "@/lib/utils/awardReveal";
import { HOME_SECTION_KEYS, type Category, type Exhibition, type HomeSectionKey } from "@/types/models";
import { ContestBanners } from "@/components/home/ContestBanners";
import { PopularExhibitions } from "@/components/home/PopularExhibitions";
import { CategoryAwardResults } from "@/components/contest/AwardResults";
import { ExhibitionCard, ExhibitionCardSkeleton } from "@/components/exhibitions/ExhibitionCard";
import { ExhibitionMarquee } from "@/components/exhibitions/ExhibitionMarquee";

// Below this count a static grid reads better; above it, a static grid would
// just clip items, so we switch to the auto-scrolling marquee instead.
const MARQUEE_THRESHOLD = 6;

export default function HomePage() {
  const [recent, setRecent] = useState<Exhibition[] | null>(null);
  const [popular, setPopular] = useState<Exhibition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Admin-controlled — see /admin/banners's "메인 화면 섹션 순서" panel and
  // lib/firestore/homeLayout.ts. Defaults to this order until that doc loads
  // (or if it was never set), so the page never renders empty on first paint.
  const [sectionOrder, setSectionOrder] = useState<HomeSectionKey[]>([...HOME_SECTION_KEYS]);

  useEffect(() => {
    listPublishedExhibitions({ sort: "latest", max: 18 }).then(setRecent);
    listPublishedExhibitions({ sort: "popular", max: 3 }).then((exhibitions) =>
      setPopular(exhibitions.filter((e) => e.likeCount > 0))
    );
  }, []);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeHomeLayout(setSectionOrder);
    return () => unsub();
  }, []);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const visibleRecent = useMemo(
    () => (recent ? redactUnannouncedAwards(recent, categoriesById) : null),
    [recent, categoriesById]
  );

  // Contests that might have something to show in the 수상 결과 section —
  // either a reveal countdown was ever set, or the popular-award scheduler
  // has run for them. Cheap boolean checks on data already in `categories`,
  // so ordinary awardless contests never trigger the section's own fetch.
  const awardCandidates = categories.filter((c) => !!c.awardAnnounceAt || !!c.popularAwardAssignedAt);

  const sections: Record<HomeSectionKey, ReactNode> = {
    banners: <ContestBanners key="banners" />,
    popular: <PopularExhibitions key="popular" exhibitions={popular} />,
    awards:
      awardCandidates.length > 0 ? (
        <section key="awards" className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {awardCandidates.map((c) => (
              <CategoryAwardResults key={c.id} category={c} showHeading />
            ))}
          </div>
        </section>
      ) : null,
    recent: (
      <section key="recent" className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">최근 전시물</h2>
          <Link href="/exhibitions" className="text-sm font-semibold text-primary">
            전체보기
          </Link>
        </div>
        {visibleRecent === null ? (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ExhibitionCardSkeleton key={i} />
            ))}
          </div>
        ) : visibleRecent.length > MARQUEE_THRESHOLD ? (
          <ExhibitionMarquee exhibitions={visibleRecent} />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRecent.map((e) => (
              <ExhibitionCard key={e.id} exhibition={e} />
            ))}
          </div>
        )}
        {visibleRecent && visibleRecent.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">아직 등록된 전시물이 없어요.</p>
        )}
      </section>
    ),
  };

  return <div>{sectionOrder.map((key) => sections[key])}</div>;
}
