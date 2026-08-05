"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTeam, subscribeMyMemberships } from "@/lib/firestore/teams";
import type { Team, TeamMembership } from "@/types/models";
import { Badge, CenteredSpinner } from "@/components/ui/misc";

export default function MyTeamsPage() {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length === 0) {
      setTeams([]);
      return;
    }
    Promise.all(memberships.map((m) => getTeam(m.teamId))).then((ts) =>
      setTeams(ts.filter((t): t is Team => !!t))
    );
  }, [memberships]);

  if (!profile) return <CenteredSpinner />;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <Users className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">내 팀</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">참여 중인 팀</h2>
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
    </div>
  );
}
