"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, LayoutGrid, MessageCircle, Plus, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listTeamExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeMyMemberships } from "@/lib/firestore/teams";
import type { Exhibition, ExhibitionStatus, TeamMembership } from "@/types/models";
import { Badge, CenteredSpinner } from "@/components/ui/misc";

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  draft: "임시저장",
  published: "게시중",
  hidden: "숨김",
};

export default function MyExhibitionsPage() {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length === 0) {
      setExhibitions([]);
      return;
    }
    Promise.all(memberships.map((m) => listTeamExhibitions(m.teamId))).then((lists) =>
      setExhibitions(lists.flat().sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()))
    );
  }, [memberships]);

  if (!profile) return <CenteredSpinner />;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <LayoutGrid className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">내 게시글</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">등록한 전시물</h2>
          <Link href="/exhibitions/new" className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Plus size={14} /> 등록
          </Link>
        </div>
        {exhibitions === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : exhibitions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 등록한 전시물이 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {exhibitions.map((e) => (
              <li key={e.id} className="rounded-xl bg-surface px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/exhibitions/${e.id}`} className="truncate font-medium hover:text-primary">
                    {e.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{e.categoryName}</Badge>
                    <span className="text-xs text-muted">{STATUS_LABEL[e.status]}</span>
                    {e.award && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Trophy size={12} /> {e.award.label}
                      </span>
                    )}
                  </div>
                </div>
                {e.status === "published" && (
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {e.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {e.commentCount}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
