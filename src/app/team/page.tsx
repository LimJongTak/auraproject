"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Copy, Check, LogOut, Trash2, Plus } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { subscribeCategories } from "@/lib/firestore/categories";
import { createTeam, joinTeam, leaveTeam, disbandTeam, subscribeMyMemberships, TeamError } from "@/lib/firestore/teams";
import { deleteExhibition, listTeamExhibitions } from "@/lib/firestore/exhibitions";
import type { Category, Exhibition, Team, TeamMembership } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";

export default function TeamPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories((cats) => setCategories(cats.filter((c) => c.isActive)));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeMyMemberships(firebaseUser.uid, setMemberships);
    return () => unsub();
  }, [firebaseUser]);

  if (loading) return <CenteredSpinner />;

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-semibold">로그인이 필요해요</p>
        <p className="mt-1 text-sm text-muted">팀을 구성하려면 먼저 로그인해주세요.</p>
        <Button className="mt-6" onClick={() => router.push("/login")}>
          로그인하러 가기
        </Button>
      </div>
    );
  }

  if (categories === null || memberships === null) return <CenteredSpinner />;

  const membershipByCategory = new Map(memberships.map((m) => [m.categoryId, m]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="mb-8 flex items-center gap-2">
        <Users className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">팀 구성</h1>
      </div>
      <p className="mb-6 -mt-6 text-sm text-muted">대회마다 별도의 팀을 만들거나 참가할 수 있어요.</p>

      {categories.length === 0 ? (
        <p className="text-sm text-muted">아직 등록된 대회가 없어요.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((c) => (
            <CategoryTeamSection
              key={c.id}
              category={c}
              membership={membershipByCategory.get(c.id) ?? null}
              uid={firebaseUser.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTeamSection({
  category,
  membership,
  uid,
}: {
  category: Category;
  membership: TeamMembership | null;
  uid: string;
}) {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(!!membership);

  useEffect(() => {
    if (!membership) {
      setTeam(null);
      setTeamLoading(false);
      return;
    }
    setTeamLoading(true);
    const unsub = onSnapshot(doc(db, "teams", membership.teamId), (snap) => {
      setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
      setTeamLoading(false);
    });
    return () => unsub();
  }, [membership?.teamId]);

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted">
        {category.name}
        {team && <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">참가중</span>}
      </h2>
      {teamLoading ? (
        <div className="rounded-2xl border border-border bg-white p-6">
          <CenteredSpinner />
        </div>
      ) : team ? (
        <MyTeam team={team} uid={uid} />
      ) : category.teamSizeMax === 1 ? (
        <SoloCategoryNotice categoryId={category.id} />
      ) : (
        <TeamOnboarding categoryId={category.id} categoryName={category.name} uid={uid} />
      )}
    </div>
  );
}

function SoloCategoryNotice({ categoryId }: { categoryId: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 text-center">
      <p className="text-sm text-muted">1인 참가 대회예요. 팀을 만들 필요 없이 전시물을 등록하면 바로 참가돼요.</p>
      <Link href={`/exhibitions/new?categoryId=${categoryId}`}>
        <Button size="sm">
          <Plus size={14} /> 전시물 등록하러 가기
        </Button>
      </Link>
    </div>
  );
}

function TeamOnboarding({ categoryId, categoryName, uid }: { categoryId: string; categoryName: string; uid: string }) {
  const [tab, setTab] = useState<"create" | "join">("create");

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-6 flex gap-2 rounded-full bg-surface p-1">
        <button
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-semibold transition",
            tab === "create" ? "bg-white shadow-sm text-primary" : "text-muted"
          )}
          onClick={() => setTab("create")}
        >
          팀 만들기
        </button>
        <button
          className={cn(
            "flex-1 rounded-full py-2 text-sm font-semibold transition",
            tab === "join" ? "bg-white shadow-sm text-primary" : "text-muted"
          )}
          onClick={() => setTab("join")}
        >
          초대코드로 참가
        </button>
      </div>
      {tab === "create" ? (
        <CreateTeamForm uid={uid} categoryId={categoryId} categoryName={categoryName} />
      ) : (
        <JoinTeamForm uid={uid} />
      )}
    </div>
  );
}

function CreateTeamForm({ uid, categoryId, categoryName }: { uid: string; categoryId: string; categoryName: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTeam(uid, name.trim(), categoryId, categoryName);
    } catch (err) {
      setError(err instanceof TeamError ? err.message : "팀 생성에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="팀 이름"
        placeholder="예: 유니콘팀"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" loading={submitting} disabled={!name.trim()}>
        팀 만들기
      </Button>
    </form>
  );
}

function JoinTeamForm({ uid }: { uid: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await joinTeam(uid, code.trim());
    } catch (err) {
      setError(err instanceof TeamError ? err.message : "팀 참가에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="초대코드"
        placeholder="예: 7X4K2M"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="uppercase tracking-widest"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" loading={submitting} disabled={!code.trim()}>
        참가하기
      </Button>
    </form>
  );
}

function MyTeam({ team, uid }: { team: Team; uid: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLeader = team.leaderUid === uid;

  function handleCopy() {
    navigator.clipboard.writeText(team.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await leaveTeam(uid, team.id);
    } catch (err) {
      setError(err instanceof TeamError ? err.message : "탈퇴에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisband() {
    setBusy(true);
    setError(null);
    try {
      await disbandTeam(uid, team.id);
    } catch (err) {
      setError(err instanceof TeamError ? err.message : "팀 해체에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold">{team.name}</h3>
          <p className="mt-1 text-sm text-muted">팀원 {team.memberUids.length}명</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="tracking-widest">{team.id}</span>
        </button>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {team.memberUids.map((memberUid) => (
          <li
            key={memberUid}
            className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-sm"
          >
            <span className="font-mono text-xs text-muted">{memberUid.slice(0, 10)}…</span>
            {memberUid === team.leaderUid && (
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                팀장
              </span>
            )}
          </li>
        ))}
      </ul>

      {error && <ErrorText>{error}</ErrorText>}

      <div className="mt-6 flex justify-end gap-2">
        {isLeader ? (
          <Button
            variant="danger"
            size="sm"
            loading={busy}
            disabled={team.memberUids.length > 1}
            onClick={handleDisband}
            title={team.memberUids.length > 1 ? "다른 팀원이 모두 탈퇴한 후 해체할 수 있어요" : undefined}
          >
            <Trash2 size={14} /> 팀 해체
          </Button>
        ) : (
          <Button variant="outline" size="sm" loading={busy} onClick={handleLeave}>
            <LogOut size={14} /> 팀 탈퇴
          </Button>
        )}
      </div>

      <TeamExhibitions teamId={team.id} />
    </div>
  );
}

function TeamExhibitions({ teamId }: { teamId: string }) {
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    listTeamExhibitions(teamId).then(setExhibitions);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function handleDelete(e: Exhibition) {
    if (!confirm(`"${e.title}"을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    setDeletingId(e.id);
    try {
      await deleteExhibition(e.id);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">우리 팀 전시물</h4>
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
            <li key={e.id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-sm">
              <Link href={`/exhibitions/${e.id}`} className="truncate font-medium hover:text-primary">
                {e.title}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>{e.categoryName}</Badge>
                <span className="text-xs text-muted">
                  {e.status === "draft" ? "임시저장" : e.status === "hidden" ? "숨김" : "게시중"}
                </span>
                <button
                  onClick={() => handleDelete(e)}
                  disabled={deletingId === e.id}
                  className="text-muted hover:text-red-600 disabled:opacity-50"
                  aria-label="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
