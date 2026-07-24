"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Heart, MessageCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/Guard";
import { listTeamExhibitions } from "@/lib/firestore/exhibitions";
import { getTeam, subscribeMyMemberships } from "@/lib/firestore/teams";
import type { Exhibition, ExhibitionStatus, Team, TeamMembership } from "@/types/models";
import { Badge, CenteredSpinner } from "@/components/ui/misc";

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  draft: "임시저장",
  published: "게시중",
  hidden: "숨김",
};

export default function MyPage() {
  return (
    <RequireAuth>
      <MyPageContent />
    </RequireAuth>
  );
}

function MyPageContent() {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length === 0) {
      setTeams([]);
      setExhibitions([]);
      return;
    }
    Promise.all(memberships.map((m) => getTeam(m.teamId))).then((ts) =>
      setTeams(ts.filter((t): t is Team => !!t))
    );
    Promise.all(memberships.map((m) => listTeamExhibitions(m.teamId))).then((lists) =>
      setExhibitions(lists.flat().sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()))
    );
  }, [memberships]);

  if (!profile) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex items-center gap-2">
        <User className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">마이페이지</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <p className="text-lg font-bold">{profile.name}</p>
        <p className="mt-1 text-sm text-muted">{profile.email}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <InfoItem label="학교" value={profile.school} />
          <InfoItem label="학과" value={profile.department || "-"} />
          <InfoItem label="학년" value={profile.grade} />
          <InfoItem label="학번" value={profile.studentId} />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">내 팀</h2>
          <Link href="/team" className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Plus size={14} /> 팀 구성하러 가기
          </Link>
        </div>
        {teams === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 소속된 팀이 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-sm">
                <span className="font-medium">{t.name}</span>
                <Badge>{t.categoryName}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">내 게시글</h2>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
