"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Trophy } from "lucide-react";
import { deleteExhibition, getExhibition } from "@/lib/firestore/exhibitions";
import { getCategory } from "@/lib/firestore/categories";
import { getMembership } from "@/lib/firestore/teams";
import { getSubmissionWindowState } from "@/lib/utils/dateWindow";
import type { Exhibition } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { LinkPreviewCard, LinkPreviewFallback } from "@/components/link-preview/LinkPreviewCard";
import { LikeButton } from "@/components/exhibitions/LikeButton";
import { CommentSection } from "@/components/exhibitions/CommentSection";
import { PdfPageScroller } from "@/components/exhibitions/PdfPageScroller";
import { JudgeFloatingScorePanel } from "@/components/judge/JudgeFloatingScorePanel";
import { HashtagBadges } from "@/components/exhibitions/HashtagBadges";
import { ReferenceLinksRow } from "@/components/exhibitions/ReferenceLinksRow";
import { ShareButton } from "@/components/exhibitions/ShareButton";
import { OtherExhibitions } from "@/components/exhibitions/OtherExhibitions";
import { cn } from "@/lib/utils/cn";

export function ExhibitionDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null | undefined>(undefined);
  const [tab, setTab] = useState<"story" | "comments">("story");
  const [deleting, setDeleting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [submissionClosed, setSubmissionClosed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getExhibition(params.id).then(setExhibition);
  }, [params.id]);

  useEffect(() => {
    if (!profile || !exhibition) {
      setCanEdit(false);
      return;
    }
    if (profile.role === "admin") {
      setIsAdmin(true);
      setCanEdit(true);
      return;
    }
    getMembership(profile.uid, exhibition.categoryId).then((m) => {
      setCanEdit(!!m && m.teamId === exhibition.teamId);
    });
    getCategory(exhibition.categoryId).then((c) => {
      setSubmissionClosed(!c || getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt) === "closed");
    });
  }, [profile, exhibition]);

  if (exhibition === undefined) return <CenteredSpinner />;
  if (exhibition === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="전시물을 찾을 수 없어요" description="삭제되었거나 존재하지 않는 게시물이에요." />
      </div>
    );
  }

  async function handleDelete() {
    if (!exhibition) return;
    if (!confirm(`"${exhibition.title}"을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    setDeleting(true);
    try {
      await deleteExhibition(exhibition.id);
      router.push("/team");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: "온라인전시관", href: "/exhibitions" },
          { label: exhibition.title },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge>{exhibition.categoryName}</Badge>
          {exhibition.award && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <Trophy size={12} /> {exhibition.award.label}
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-4">
            {isAdmin || !submissionClosed ? (
              <Link
                href={`/exhibitions/${exhibition.id}/edit`}
                className="flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
              >
                <Pencil size={14} /> 수정
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted/50" title="게시 마감일이 지나 수정할 수 없어요">
                게시 마감으로 수정 불가
              </span>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-sm font-medium text-muted hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} /> {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm font-semibold text-muted">{exhibition.teamName}</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{exhibition.title}</h1>
      <p className="mt-2 text-foreground/80">{exhibition.oneLiner}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          🏅 {exhibition.year}
        </span>
        <HashtagBadges hashtags={exhibition.hashtags ?? []} />
      </div>

      {exhibition.projectUrl && (
        <div className="mt-6">
          {exhibition.linkPreview ? (
            <LinkPreviewCard
              url={exhibition.projectUrl}
              title={exhibition.linkPreview.title}
              description={exhibition.linkPreview.description}
              image={exhibition.linkPreview.image}
              favicon={exhibition.linkPreview.favicon}
              domain={exhibition.linkPreview.domain}
            />
          ) : (
            <LinkPreviewFallback url={exhibition.projectUrl} />
          )}
        </div>
      )}

      <div className="mt-4">
        <ReferenceLinksRow links={exhibition.referenceLinks} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <LikeButton exhibitionId={exhibition.id} likeCount={exhibition.likeCount} />
        <ShareButton title={exhibition.title} text={exhibition.oneLiner} />
      </div>

      <div className="mt-10 flex gap-6 border-b border-border">
        <button
          onClick={() => setTab("story")}
          className={cn(
            "border-b-2 py-4 text-sm font-bold transition",
            tab === "story" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          아이템 소개
        </button>
        <button
          onClick={() => setTab("comments")}
          className={cn(
            "border-b-2 py-4 text-sm font-bold transition",
            tab === "comments" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          커뮤니티
        </button>
      </div>

      <div className="py-8">
        {tab === "story" ? (
          <PdfPageScroller pageImageUrls={exhibition.pageImageUrls} />
        ) : (
          <CommentSection exhibitionId={exhibition.id} />
        )}
      </div>

      <OtherExhibitions currentId={exhibition.id} />

      <JudgeFloatingScorePanel exhibition={exhibition} />
    </div>
  );
}
