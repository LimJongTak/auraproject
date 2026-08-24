"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Layers, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeMyMemberships } from "@/lib/firestore/teams";
import type { Exhibition, TeamMembership } from "@/types/models";
import { ContestBanners } from "@/components/home/ContestBanners";
import { ExhibitionCard, ExhibitionCardSkeleton } from "@/components/exhibitions/ExhibitionCard";
import { ExhibitionMarquee } from "@/components/exhibitions/ExhibitionMarquee";
import { Button } from "@/components/ui/Button";

// Below this count a static grid reads better; above it, a static grid would
// just clip items, so we switch to the auto-scrolling marquee instead.
const MARQUEE_THRESHOLD = 6;

export default function HomePage() {
  const { firebaseUser, profile } = useAuth();
  const [recent, setRecent] = useState<Exhibition[] | null>(null);
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);

  useEffect(() => {
    listPublishedExhibitions({ sort: "latest", max: 18 }).then(setRecent);
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  return (
    <div>
      <ContestBanners />

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
                <Users size={12} /> 팀 구성
              </span>
              <h3 className="mt-3 text-xl font-bold">함께할 팀을 만들어보세요</h3>
              <p className="mt-1 text-sm text-muted">팀을 만들거나 초대코드로 참가해 전시물을 함께 준비해요.</p>
            </div>
            <Link href="/team" className="mt-6">
              <Button variant="outline" className="w-full">
                팀 구성하러 가기 <ArrowRight size={14} />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
                <Layers size={12} /> 온라인전시관
              </span>
              <h3 className="mt-3 text-xl font-bold">전시물을 둘러보고 응원해요</h3>
              <p className="mt-1 text-sm text-muted">다른 팀의 프로젝트를 살펴보고 좋아요와 댓글을 남겨보세요.</p>
            </div>
            <Link href="/exhibitions" className="mt-6">
              <Button className="w-full">
                온라인전시관 보기 <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>

        {!firebaseUser && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
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
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
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

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">최근 전시물</h2>
          <Link href="/exhibitions" className="text-sm font-semibold text-primary">
            전체보기
          </Link>
        </div>
        {recent === null ? (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ExhibitionCardSkeleton key={i} />
            ))}
          </div>
        ) : recent.length > MARQUEE_THRESHOLD ? (
          <ExhibitionMarquee exhibitions={recent} />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((e) => (
              <ExhibitionCard key={e.id} exhibition={e} />
            ))}
          </div>
        )}
        {recent && recent.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">아직 등록된 전시물이 없어요.</p>
        )}
      </section>
    </div>
  );
}
