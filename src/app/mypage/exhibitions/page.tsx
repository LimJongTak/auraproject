"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, LayoutGrid, MessageCircle, Plus, Trash2, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { deleteExhibition, listTeamExhibitions } from "@/lib/firestore/exhibitions";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  function refresh() {
    if (!memberships) return;
    Promise.all(memberships.map((m) => listTeamExhibitions(m.teamId))).then((lists) =>
      setExhibitions(lists.flat().sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()))
    );
  }

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length === 0) {
      setExhibitions([]);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships]);

  async function handleDeleteDraft(e: Exhibition) {
    if (!confirm(`"${e.title}" 임시저장 글을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setDeletingId(e.id);
    try {
      await deleteExhibition(e.id);
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

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
                  {e.status === "draft" ? (
                    <Link
                      href={`/exhibitions/new?categoryId=${e.categoryId}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      {e.title}
                    </Link>
                  ) : (
                    <Link href={`/exhibitions/${e.id}`} className="truncate font-medium hover:text-primary">
                      {e.title}
                    </Link>
                  )}
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{e.categoryName}</Badge>
                    <span className="text-xs text-muted">{STATUS_LABEL[e.status]}</span>
                    {e.award && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Trophy size={12} /> {e.award.label}
                      </span>
                    )}
                    {e.popularAwardRank && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <Heart size={12} /> 인기상
                      </span>
                    )}
                    {e.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(e)}
                        disabled={deletingId === e.id}
                        className="text-muted transition hover:text-red-600 disabled:opacity-50"
                        aria-label="임시저장 글 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {e.status === "draft" && (
                  <p className="mt-1.5 text-xs text-muted">
                    등록이 끝나지 않은 글이에요. 제목을 눌러 이어서 작성할 수 있어요.
                  </p>
                )}
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
