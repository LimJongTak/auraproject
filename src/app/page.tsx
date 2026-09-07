"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeMyMemberships } from "@/lib/firestore/teams";
import { subscribeCategories } from "@/lib/firestore/categories";
import { redactUnannouncedAwards } from "@/lib/utils/awardReveal";
import type { Category, Exhibition, TeamMembership } from "@/types/models";
import { ContestBanners } from "@/components/home/ContestBanners";
import { PopularExhibitions } from "@/components/home/PopularExhibitions";
import { CategoryAwardResults } from "@/components/contest/AwardResults";
import { ExhibitionCard, ExhibitionCardSkeleton } from "@/components/exhibitions/ExhibitionCard";
import { ExhibitionMarquee } from "@/components/exhibitions/ExhibitionMarquee";
import { Button } from "@/components/ui/Button";

// Below this count a static grid reads better; above it, a static grid would
// just clip items, so we switch to the auto-scrolling marquee instead.
const MARQUEE_THRESHOLD = 6;

export default function HomePage() {
  const { firebaseUser, profile } = useAuth();
  const [recent, setRecent] = useState<Exhibition[] | null>(null);
  const [popular, setPopular] = useState<Exhibition[]>([]);
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listPublishedExhibitions({ sort: "latest", max: 18 }).then(setRecent);
    listPublishedExhibitions({ sort: "popular", max: 3 }).then((exhibitions) =>
      setPopular(exhibitions.filter((e) => e.likeCount > 0))
    );
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
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

  return (
    <div>
      <ContestBanners />

      <PopularExhibitions exhibitions={popular} />

      {awardCandidates.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <h2 className="text-xl font-extrabold">수상 결과</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {awardCandidates.map((c) => (
              <CategoryAwardResults key={c.id} category={c} showHeading />
            ))}
          </div>
        </section>
      )}

      {(!firebaseUser || (profile && memberships && memberships.length === 0)) && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          {!firebaseUser && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-bold">아직 회원이 아니신가요?</p>
                <p className="text-sm text-muted">이름, 학교, 학번 정보로 간편하게 가입할 수 있어요.</p>
              </div>
              <Link href="/signup">
                <Button>회원가입하기</Button>
              </Link>
            </div>
          )}

          {profile && memberships && memberships.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-bold">아직 팀이 없으신가요?</p>
                <p className="text-sm text-muted">전시물을 등록하려면 먼저 팀을 구성해야 해요.</p>
              </div>
              <Link href="/team">
                <Button>팀 구성하기</Button>
              </Link>
            </div>
          )}
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-20">
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
    </div>
  );
}
