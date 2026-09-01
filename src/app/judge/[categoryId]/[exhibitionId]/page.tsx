"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, SkipForward } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireJudgeOrAdmin } from "@/components/auth/Guard";
import { getCategory } from "@/lib/firestore/categories";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeEvaluationsForCategory } from "@/lib/firestore/evaluations";
import { getAssignment } from "@/lib/firestore/judgeAssignments";
import { RubricScoreForm } from "@/components/judge/RubricScoreForm";
import { LinkPreviewCard, LinkPreviewFallback } from "@/components/link-preview/LinkPreviewCard";
import { HashtagBadges } from "@/components/exhibitions/HashtagBadges";
import { ReferenceLinksRow } from "@/components/exhibitions/ReferenceLinksRow";
import { PdfPageScroller } from "@/components/exhibitions/PdfPageScroller";
import type { Category, Evaluation, Exhibition, JudgeAssignment } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";

export default function JudgeExhibitionPage() {
  return (
    <RequireJudgeOrAdmin>
      <JudgeExhibitionWorkspace />
    </RequireJudgeOrAdmin>
  );
}

function JudgeExhibitionWorkspace() {
  const params = useParams<{ categoryId: string; exhibitionId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [category, setCategory] = useState<Category | null | undefined>(undefined);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [myAssignment, setMyAssignment] = useState<JudgeAssignment | null | undefined>(undefined);

  useEffect(() => {
    getCategory(params.categoryId).then(setCategory);
  }, [params.categoryId]);

  useEffect(() => {
    if (!profile || profile.role !== "judge") return;
    getAssignment(profile.uid, params.categoryId)
      .then(setMyAssignment)
      .catch(() => setMyAssignment(null));
  }, [profile, params.categoryId]);

  useEffect(() => {
    listPublishedExhibitions({ categoryId: params.categoryId, max: 500 }).then(setExhibitions);
  }, [params.categoryId]);

  useEffect(() => {
    const unsub = subscribeEvaluationsForCategory(params.categoryId, setEvaluations);
    return () => unsub();
  }, [params.categoryId]);

  const myEvalByExhibition = useMemo(() => {
    const map = new Map<string, Evaluation>();
    if (!evaluations || !profile) return map;
    for (const ev of evaluations) {
      if (ev.judgeUid === profile.uid) map.set(ev.exhibitionId, ev);
    }
    return map;
  }, [evaluations, profile]);

  const isJudge = profile?.role === "judge";
  if (category === undefined || exhibitions === null || !profile || (isJudge && myAssignment === undefined)) {
    return <CenteredSpinner />;
  }
  if (category === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="대회를 찾을 수 없어요" description="삭제되었거나 존재하지 않는 대회예요." />
      </div>
    );
  }
  if (isJudge && !myAssignment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="이 대회의 심사위원으로 지정되지 않았어요" description="관리자에게 심사위원 지정을 요청해주세요." />
      </div>
    );
  }

  const currentIndex = exhibitions.findIndex((ex) => ex.id === params.exhibitionId);
  const exhibition = currentIndex === -1 ? null : exhibitions[currentIndex];
  if (!exhibition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="작품을 찾을 수 없어요" description="목록에서 다시 선택해주세요." />
        <div className="mt-4 flex justify-center">
          <Link href={`/judge/${params.categoryId}`}>
            <Button variant="outline" size="sm">
              목록으로
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const rubric = category.rubric ?? [];
  const scoredCount = exhibitions.filter((ex) => myEvalByExhibition.has(ex.id)).length;
  const prevExhibition = currentIndex > 0 ? exhibitions[currentIndex - 1] : null;
  const nextExhibition = currentIndex < exhibitions.length - 1 ? exhibitions[currentIndex + 1] : null;
  // Wraps around so "다음 미채점 작품" stays useful even once the judge has
  // looped past the end of the list with a few stragglers left unscored.
  const nextUnscored = (() => {
    for (let offset = 1; offset <= exhibitions.length; offset++) {
      const candidate = exhibitions[(currentIndex + offset) % exhibitions.length];
      if (!myEvalByExhibition.has(candidate.id)) return candidate;
    }
    return null;
  })();

  function goTo(id: string) {
    router.push(`/judge/${params.categoryId}/${id}`);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: "평가", href: "/judge" },
          { label: category.name, href: `/judge/${category.id}` },
          { label: exhibition.title },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/judge/${category.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft size={16} /> 목록으로
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-muted">
            {currentIndex + 1} / {exhibitions.length} · 채점 {scoredCount}/{exhibitions.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={!prevExhibition}
              onClick={() => prevExhibition && goTo(prevExhibition.id)}
            >
              <ChevronLeft size={14} /> 이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!nextExhibition}
              onClick={() => nextExhibition && goTo(nextExhibition.id)}
            >
              다음 <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="min-w-0 flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted">{exhibition.teamName}</p>
                <h1 className="mt-1 text-xl font-extrabold">{exhibition.title}</h1>
              </div>
              <Link
                href={`/exhibitions/${exhibition.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                <ExternalLink size={13} /> 새 탭에서 보기
              </Link>
            </div>
            <p className="mt-2 max-w-3xl text-foreground/80">{exhibition.oneLiner}</p>
            {exhibition.hashtags && exhibition.hashtags.length > 0 && (
              <div className="mt-3">
                <HashtagBadges hashtags={exhibition.hashtags} interactive={false} />
              </div>
            )}
            {exhibition.projectUrl && (
              <div className="mt-4">
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
          </div>

          {exhibition.pageImageUrls.length > 0 ? (
            <PdfPageScroller pageImageUrls={exhibition.pageImageUrls} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
              등록된 발표자료가 없어요
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="font-bold">채점하기</p>
            {rubric.length === 0 ? (
              <p className="mt-3 text-sm text-muted">이 대회에는 평가표가 설정되어 있지 않아요.</p>
            ) : (
              <div className="mt-4">
                <RubricScoreForm
                  key={exhibition.id}
                  exhibitionId={exhibition.id}
                  categoryId={category.id}
                  rubric={rubric}
                  judgeUid={profile.uid}
                  judgeName={profile.name}
                  initial={myEvalByExhibition.get(exhibition.id) ?? null}
                />
              </div>
            )}
          </div>

          {nextUnscored && nextUnscored.id !== exhibition.id && (
            <Button variant="outline" className="w-full" onClick={() => goTo(nextUnscored.id)}>
              <SkipForward size={14} /> 다음 미채점 작품으로
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
