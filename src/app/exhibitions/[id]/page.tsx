"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExhibition, getExhibition } from "@/lib/firestore/exhibitions";
import { getMembership } from "@/lib/firestore/teams";
import type { Exhibition } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { LinkPreviewCard } from "@/components/link-preview/LinkPreviewCard";
import { LikeButton } from "@/components/exhibitions/LikeButton";
import { CommentSection } from "@/components/exhibitions/CommentSection";
import { PdfPageScroller } from "@/components/exhibitions/PdfPageScroller";
import { cn } from "@/lib/utils/cn";

export default function ExhibitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null | undefined>(undefined);
  const [tab, setTab] = useState<"story" | "comments">("story");
  const [deleting, setDeleting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    getExhibition(params.id).then(setExhibition);
  }, [params.id]);

  useEffect(() => {
    if (!profile || !exhibition) {
      setCanEdit(false);
      return;
    }
    if (profile.role === "admin") {
      setCanEdit(true);
      return;
    }
    getMembership(profile.uid, exhibition.categoryId).then((m) => {
      setCanEdit(!!m && m.teamId === exhibition.teamId);
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
        <Badge>{exhibition.categoryName}</Badge>
        {canEdit && (
          <div className="flex items-center gap-4">
            <Link
              href={`/exhibitions/${exhibition.id}/edit`}
              className="flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
            >
              <Pencil size={14} /> 수정
            </Link>
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

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
          🏅 {exhibition.year}
        </span>
      </div>

      {exhibition.projectUrl && exhibition.linkPreview && (
        <div className="mt-6">
          <LinkPreviewCard
            url={exhibition.projectUrl}
            title={exhibition.linkPreview.title}
            description={exhibition.linkPreview.description}
            image={exhibition.linkPreview.image}
            favicon={exhibition.linkPreview.favicon}
            domain={exhibition.linkPreview.domain}
          />
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <LikeButton exhibitionId={exhibition.id} likeCount={exhibition.likeCount} />
      </div>

      <div className="mt-10 border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setTab("story")}
            className={cn(
              "border-b-2 pb-3 text-sm font-bold transition",
              tab === "story" ? "border-primary text-primary" : "border-transparent text-muted"
            )}
          >
            TEAM STORY
          </button>
          <button
            onClick={() => setTab("comments")}
            className={cn(
              "border-b-2 pb-3 text-sm font-bold transition",
              tab === "comments" ? "border-primary text-primary" : "border-transparent text-muted"
            )}
          >
            응원 댓글 ({exhibition.commentCount})
          </button>
        </div>
      </div>

      <div className="py-8">
        {tab === "story" ? (
          <PdfPageScroller pageImageUrls={exhibition.pageImageUrls} />
        ) : (
          <CommentSection exhibitionId={exhibition.id} />
        )}
      </div>
    </div>
  );
}
