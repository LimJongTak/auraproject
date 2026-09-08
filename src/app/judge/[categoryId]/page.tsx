"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import {
  ArrowRight,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCountdownTimer } from "@/hooks/useCountdown";
import { RequireJudgeOrAdmin } from "@/components/auth/Guard";
import { getCategory, updateCategoryAwardAnnounce } from "@/lib/firestore/categories";
import {
  getExhibitionJudgeComments,
  listPublishedExhibitions,
  setExhibitionAward,
  setExhibitionJudgeComments,
} from "@/lib/firestore/exhibitions";
import { subscribeEvaluationsForCategory } from "@/lib/firestore/evaluations";
import { getAssignment, listAssignmentsForCategory } from "@/lib/firestore/judgeAssignments";
import { ScoreSheetExcelPanel } from "@/components/judge/ScoreSheetExcelPanel";
import { JudgeAssignmentPanel } from "@/components/admin/JudgeAssignmentPanel";
import { JudgingStatusPanel } from "@/components/admin/JudgingStatusPanel";
import { EvaluationHistoryPanel } from "@/components/admin/EvaluationHistoryPanel";
import { buildJudgingResultsWorkbook } from "@/lib/admin/judgingResultsExcel";
import type { Category, Evaluation, Exhibition, JudgeAssignment } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { toLocalInputValue } from "@/lib/utils/dateWindow";
import { cn } from "@/lib/utils/cn";

const AWARD_PRESETS = ["대상", "최우수상", "우수상", "1등", "2등", "3등"];

export default function JudgeCategoryPage() {
  return (
    <RequireJudgeOrAdmin>
      <JudgeCategoryDetail />
    </RequireJudgeOrAdmin>
  );
}

function JudgeCategoryDetail() {
  const params = useParams<{ categoryId: string }>();
  const { profile } = useAuth();
  const [category, setCategory] = useState<Category | null | undefined>(undefined);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  // Only meaningful for role == 'judge' — undefined while loading, null once
  // confirmed the caller isn't assigned to this contest. Admins skip this
  // check entirely (see the gate below).
  const [myAssignment, setMyAssignment] = useState<JudgeAssignment | null | undefined>(undefined);
  // Every judge assigned to this contest — admin-only, drives the judging-
  // status panel, the results Excel export, and stays in sync with
  // JudgeAssignmentPanel via its onChange callback below.
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  // Collapsed by default — contests can have hundreds of submissions, and
  // most visits here are either "check my progress" or "jump into scoring"
  // (both served by the button above), not "scroll the whole roster".
  const [showExhibitionList, setShowExhibitionList] = useState(false);

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
    if (!profile || profile.role !== "admin") return;
    listAssignmentsForCategory(params.categoryId).then(setAssignments);
  }, [profile, params.categoryId]);

  useEffect(() => {
    listPublishedExhibitions({ categoryId: params.categoryId, max: 500 }).then(setExhibitions);
  }, [params.categoryId]);

  // Live — a score entered here, or from the exhibition detail page's
  // floating scoring panel, shows up in this list and the award panel below
  // without needing a refresh.
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

  const rubric = category.rubric ?? [];
  const scoredCount = exhibitions.filter((ex) => myEvalByExhibition.has(ex.id)).length;
  const nextUnscored = exhibitions.find((ex) => !myEvalByExhibition.has(ex.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "평가", href: "/judge" }, { label: category.name }]} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{category.name} 평가</h1>
          <p className="mt-1 text-sm text-muted">
            제출작 {exhibitions.length}개 · 채점 {scoredCount}/{exhibitions.length}
          </p>
        </div>
        {rubric.length > 0 && exhibitions.length > 0 && (
          <Link href={`/judge/${category.id}/${(nextUnscored ?? exhibitions[0]).id}`}>
            <Button size="sm">
              <PlayCircle size={15} /> {scoredCount === 0 ? "심사 시작하기" : nextUnscored ? "이어서 심사하기" : "채점 결과 보기"}
            </Button>
          </Link>
        )}
      </div>
      {exhibitions.length > 0 && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(scoredCount / exhibitions.length) * 100}%` }}
          />
        </div>
      )}

      {rubric.length > 0 && exhibitions.length > 0 && (
        <ScoreSheetExcelPanel
          category={category}
          exhibitions={exhibitions}
          myEvalByExhibition={myEvalByExhibition}
          judgeUid={profile.uid}
          judgeName={profile.name}
        />
      )}

      {rubric.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          이 대회에는 평가표가 설정되어 있지 않아요. 대회 관리에서 평가표를 먼저 등록해주세요.
        </p>
      ) : exhibitions.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="제출된 작품이 없어요" />
        </div>
      ) : (
        <div className="mt-6">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowExhibitionList((v) => !v)}>
            {showExhibitionList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            작품 목록 {showExhibitionList ? "접기" : `보기 (${exhibitions.length})`}
          </Button>
          {showExhibitionList && (
            <ul className="mt-3 flex flex-col gap-3">
              {exhibitions.map((ex) => {
                const myEval = myEvalByExhibition.get(ex.id) ?? null;
                return (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
                  >
                    <Link href={`/judge/${category.id}/${ex.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-bold">{ex.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-sm text-muted">{ex.teamName}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                            myEval ? "bg-primary-light text-primary-dark" : "bg-surface text-muted"
                          )}
                        >
                          {myEval ? `채점완료 · ${myEval.totalScore}점` : "미채점"}
                        </span>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/exhibitions/${ex.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                      >
                        <ExternalLink size={13} /> 작품 보기
                      </Link>
                      <Link
                        href={`/judge/${category.id}/${ex.id}`}
                        className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                      >
                        심사하기 <ArrowRight size={13} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {profile.role === "admin" && (
        <JudgeAssignmentPanel categoryId={category.id} categoryName={category.name} onChange={setAssignments} />
      )}

      {profile.role === "admin" && (
        <JudgingStatusPanel
          assignments={assignments}
          evaluations={evaluations ?? []}
          exhibitions={exhibitions}
          totalExhibitions={exhibitions.length}
        />
      )}

      {profile.role === "admin" && <EvaluationHistoryPanel categoryId={category.id} exhibitions={exhibitions} />}

      {profile.role === "admin" && evaluations && rubric.length > 0 && exhibitions.length > 0 && (
        <AwardPanel
          category={category}
          exhibitions={exhibitions}
          evaluations={evaluations}
          assignments={assignments}
          onExhibitionChange={(id, patch) =>
            setExhibitions((prev) => prev && prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)))
          }
          onCategoryChange={(patch) => setCategory((prev) => prev && { ...prev, ...patch })}
        />
      )}
    </div>
  );
}

interface AwardDraft {
  preset: string;
  custom: string;
  rank: string;
}

// The public-facing snapshot for one exhibition: comment text only, judges
// anonymized as "심사위원 N" in the order they scored. Shared by the publish
// action and the "공개본이 최신이 아님" check, so the warning is comparing
// against exactly what re-publishing would write.
function buildPublishableComments(evs: Evaluation[]) {
  return evs
    .filter((e) => e.comment && e.comment.trim())
    .map((e, i) => ({ label: `심사위원 ${i + 1}`, comment: e.comment!.trim() }));
}

// Sets the public countdown target for judged-award reveal (대상/최우수상/...).
// Before it passes, Exhibition.award stays hidden from every public view
// (see redactUnannouncedAwards) even though it's already assigned below — so
// an admin can finish assigning prizes well ahead of the actual announcement.
function AwardAnnouncePanel({
  category,
  onCategoryChange,
}: {
  category: Category;
  onCategoryChange: (patch: Partial<Category>) => void;
}) {
  const [enabled, setEnabled] = useState(!!category.awardAnnounceAt);
  const [value, setValue] = useState(() =>
    toLocalInputValue(category.awardAnnounceAt?.toDate() ?? new Date(Date.now() + 3600_000))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const announceCountdown = useCountdownTimer(category.awardAnnounceAt?.toDate() ?? null);
  const announced = !!category.awardAnnounceAt && (announceCountdown?.done ?? false);

  async function handleSave() {
    setSaving(true);
    try {
      const date = new Date(value);
      await updateCategoryAwardAnnounce(category.id, date);
      onCategoryChange({ awardAnnounceAt: Timestamp.fromDate(date) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!confirm("수상 결과 발표 카운트다운을 끌까요? 수상 배지가 다시 즉시 공개돼요.")) return;
    await updateCategoryAwardAnnounce(category.id, null);
    onCategoryChange({ awardAnnounceAt: null });
    setEnabled(false);
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {enabled ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted" />}
          <div>
            <p className="text-sm font-bold">수상 결과 발표 카운트다운</p>
            <p className="text-xs text-muted">
              {enabled
                ? announced
                  ? "발표 완료 — 수상 배지와 대회 페이지 결과가 공개됐어요."
                  : "발표 전까지 수상 배지와 대회 페이지 결과가 모두 숨겨져요."
                : "꺼져 있으면 수상작 지정 즉시 배지가 공개돼요."}
            </p>
          </div>
        </div>
        {enabled && (
          <Button type="button" variant="outline" size="sm" onClick={handleDisable}>
            끄기
          </Button>
        )}
      </div>

      {enabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
          <Button type="button" size="sm" loading={saving} onClick={handleSave}>
            저장
          </Button>
          {saved && <span className="text-xs font-semibold text-primary">저장됐어요</span>}
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setEnabled(true)}>
          <Bell size={14} /> 발표 카운트다운 켜기
        </Button>
      )}
    </div>
  );
}

function AwardPanel({
  category,
  exhibitions,
  evaluations,
  assignments,
  onExhibitionChange,
  onCategoryChange,
}: {
  category: Category;
  exhibitions: Exhibition[];
  evaluations: Evaluation[];
  assignments: JudgeAssignment[];
  onExhibitionChange: (id: string, patch: Partial<Exhibition>) => void;
  onCategoryChange: (patch: Partial<Category>) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, AwardDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  // The published comment snapshot lives in a subcollection doc (restricted
  // to the submitting team + admins, see firestore.rules), not on Exhibition
  // itself — fetched here separately since admins can read every one of them.
  const [publishedComments, setPublishedComments] = useState<Record<string, { label: string; comment: string }[]>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;
    const publishedIds = exhibitions.filter((ex) => ex.judgeCommentsPublished).map((ex) => ex.id);
    if (publishedIds.length === 0) return;
    Promise.all(publishedIds.map((id) => getExhibitionJudgeComments(id).then((c) => [id, c?.comments ?? []] as const)))
      .then((entries) => {
        if (cancelled) return;
        setPublishedComments((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      });
    return () => {
      cancelled = true;
    };
  }, [exhibitions]);

  async function handleExport() {
    setExporting(true);
    try {
      const buffer = await buildJudgingResultsWorkbook(category, exhibitions, evaluations, assignments);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${category.name}_심사결과.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const ex of exhibitions) {
        if (next[ex.id]) continue;
        const isPreset = !!ex.award && AWARD_PRESETS.includes(ex.award.label);
        next[ex.id] = {
          preset: ex.award ? (isPreset ? ex.award.label : "직접입력") : "",
          custom: ex.award && !isPreset ? ex.award.label : "",
          rank: ex.award ? String(ex.award.rank) : "",
        };
      }
      return next;
    });
  }, [exhibitions]);

  const byExhibition = new Map<string, Evaluation[]>();
  for (const ev of evaluations) {
    const list = byExhibition.get(ev.exhibitionId) ?? [];
    list.push(ev);
    byExhibition.set(ev.exhibitionId, list);
  }

  const ranked = exhibitions
    .map((ex) => {
      const evs = byExhibition.get(ex.id) ?? [];
      const avgScore = evs.length > 0 ? evs.reduce((s, e) => s + e.totalScore, 0) / evs.length : 0;
      return { exhibition: ex, avgScore, judgeCount: evs.length };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  async function handleSave(exhibitionId: string) {
    const draft = drafts[exhibitionId];
    if (!draft) return;
    const label = draft.preset === "직접입력" ? draft.custom.trim() : draft.preset;
    const rank = parseInt(draft.rank, 10);
    setSavingId(exhibitionId);
    try {
      await setExhibitionAward(exhibitionId, label ? { label, rank: Number.isFinite(rank) ? rank : 0 } : null);
    } finally {
      setSavingId(null);
    }
  }

  // Toggling on takes a fresh snapshot of every judge's comment for this
  // exhibition (score never included — see ExhibitionJudgeComments) and
  // anonymizes the judge as "심사위원 N" rather than showing their name.
  // Toggling off just hides that snapshot instead of clearing it.
  async function handleToggleComments(exhibition: Exhibition, evs: Evaluation[]) {
    setPublishingId(exhibition.id);
    try {
      const nextPublished = !exhibition.judgeCommentsPublished;
      const comments = nextPublished ? buildPublishableComments(evs) : publishedComments[exhibition.id] ?? null;
      await setExhibitionJudgeComments(exhibition.id, nextPublished, comments);
      // The exhibition list is a one-shot read (listPublishedExhibitions), not
      // a live subscription, so push the write back into it — otherwise the
      // button keeps rendering the pre-toggle state until a page reload.
      onExhibitionChange(exhibition.id, { judgeCommentsPublished: nextPublished });
      setPublishedComments((prev) => ({ ...prev, [exhibition.id]: comments ?? [] }));
    } finally {
      setPublishingId(null);
    }
  }

  // Same eligibility as the per-row button: every assigned judge has scored,
  // and at least one of them left a comment. Re-publishing a row that's
  // already public just refreshes its snapshot to the latest comments.
  const publishableRows = ranked.filter((row) => {
    const evs = byExhibition.get(row.exhibition.id) ?? [];
    const allJudgesDone = assignments.length > 0 && row.judgeCount >= assignments.length;
    return allJudgesDone && evs.some((e) => e.comment && e.comment.trim());
  });
  const publishedExhibitions = exhibitions.filter((ex) => ex.judgeCommentsPublished);

  async function handlePublishAll() {
    setBulkPublishing(true);
    try {
      await Promise.all(
        publishableRows.map(async (row) => {
          const evs = byExhibition.get(row.exhibition.id) ?? [];
          const comments = buildPublishableComments(evs);
          await setExhibitionJudgeComments(row.exhibition.id, true, comments);
          onExhibitionChange(row.exhibition.id, { judgeCommentsPublished: true });
          setPublishedComments((prev) => ({ ...prev, [row.exhibition.id]: comments }));
        })
      );
    } finally {
      setBulkPublishing(false);
    }
  }

  async function handleUnpublishAll() {
    setBulkPublishing(true);
    try {
      await Promise.all(
        publishedExhibitions.map(async (ex) => {
          await setExhibitionJudgeComments(ex.id, false, publishedComments[ex.id] ?? null);
          onExhibitionChange(ex.id, { judgeCommentsPublished: false });
        })
      );
    } finally {
      setBulkPublishing(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-5">
      <AwardAnnouncePanel category={category} onCategoryChange={onCategoryChange} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">수상작 지정 · 채점 집계</h2>
          <p className="mt-1 text-sm text-muted">심사위원 평균 점수 기준으로 정렬돼요. 관리자에게만 보여요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={bulkPublishing}
            disabled={publishableRows.length === 0}
            onClick={handlePublishAll}
          >
            <MessageSquare size={14} /> 심사평 전체 공개 ({publishableRows.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={bulkPublishing}
            disabled={publishedExhibitions.length === 0}
            onClick={handleUnpublishAll}
          >
            <MessageSquare size={14} /> 심사평 전체 비공개 ({publishedExhibitions.length})
          </Button>
          <Button variant="outline" size="sm" loading={exporting} onClick={handleExport}>
            <Download size={14} /> 심사 결과 엑셀
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 pr-4 font-semibold">순위</th>
              <th className="py-2 pr-4 font-semibold">작품</th>
              <th className="py-2 pr-4 font-semibold">평균점수</th>
              <th className="py-2 pr-4 font-semibold">수상 지정</th>
              <th className="py-2 pr-4 font-semibold">심사평 공개</th>
              <th className="py-2 pr-4 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => {
              const draft = drafts[row.exhibition.id] ?? { preset: "", custom: "", rank: "" };
              const evs = byExhibition.get(row.exhibition.id) ?? [];
              const allJudgesDone = assignments.length > 0 && row.judgeCount >= assignments.length;
              const commentedEvs = evs.filter((e) => e.comment && e.comment.trim());
              const hasComments = commentedEvs.length > 0;
              const commentsOpen = openCommentsId === row.exhibition.id;
              // Published, but a judge has since edited/added a comment — the
              // snapshot on the public page is stale until it's re-published.
              const snapshotStale =
                row.exhibition.judgeCommentsPublished &&
                JSON.stringify(buildPublishableComments(evs)) !==
                  JSON.stringify(publishedComments[row.exhibition.id] ?? []);
              return (
                <Fragment key={row.exhibition.id}>
                  <tr className="border-b border-border last:border-0 align-top">
                    <td className="py-3 pr-4">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{row.exhibition.title}</p>
                      <p className="text-xs text-muted">{row.exhibition.teamName}</p>
                      <button
                        type="button"
                        onClick={() => setOpenCommentsId(commentsOpen ? null : row.exhibition.id)}
                        className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <MessageSquare size={12} />
                        심사평 {commentedEvs.length}개 {commentsOpen ? "접기" : "보기"}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      {row.avgScore.toFixed(1)}점 ({row.judgeCount}명)
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1.5">
                        <select
                          value={draft.preset}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [row.exhibition.id]: { ...draft, preset: e.target.value } }))
                          }
                          className="rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary"
                        >
                          <option value="">선택 안 함</option>
                          {AWARD_PRESETS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          <option value="직접입력">직접입력</option>
                        </select>
                        {draft.preset === "직접입력" && (
                          <input
                            type="text"
                            placeholder="수상명 직접입력"
                            value={draft.custom}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [row.exhibition.id]: { ...draft, custom: e.target.value } }))
                            }
                            className="rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary"
                          />
                        )}
                        <input
                          type="number"
                          placeholder="순위"
                          value={draft.rank}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [row.exhibition.id]: { ...draft, rank: e.target.value } }))
                          }
                          className="w-20 rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          size="sm"
                          variant={row.exhibition.judgeCommentsPublished ? "primary" : "outline"}
                          loading={publishingId === row.exhibition.id}
                          disabled={
                            bulkPublishing || (!row.exhibition.judgeCommentsPublished && (!allJudgesDone || !hasComments))
                          }
                          onClick={() => handleToggleComments(row.exhibition, evs)}
                        >
                          <MessageSquare size={14} />
                          {row.exhibition.judgeCommentsPublished ? "공개 중" : "비공개"}
                        </Button>
                        {!allJudgesDone && <span className="text-xs text-muted">심사 미완료</span>}
                        {allJudgesDone && !hasComments && <span className="text-xs text-muted">코멘트 없음</span>}
                        {snapshotStale && (
                          <span className="text-xs text-red-600">공개본이 예전 내용이에요 · 다시 눌러 갱신</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={savingId === row.exhibition.id}
                        onClick={() => handleSave(row.exhibition.id)}
                      >
                        저장
                      </Button>
                    </td>
                  </tr>
                  {commentsOpen && (
                    <tr className="border-b border-border last:border-0 bg-surface">
                      <td colSpan={6} className="px-4 py-3">
                        {evs.length === 0 ? (
                          <p className="text-sm text-muted">아직 이 작품을 채점한 심사위원이 없어요.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {evs.map((ev) => (
                              <li key={ev.id} className="rounded-xl border border-border bg-white px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-semibold">{ev.judgeName}</span>
                                  <span className="rounded-full bg-primary-light px-2 py-0.5 font-semibold text-primary-dark">
                                    {ev.totalScore}점
                                  </span>
                                  <span className="ml-auto text-muted">
                                    {ev.updatedAt ? ev.updatedAt.toDate().toLocaleString("ko-KR") : "-"}
                                  </span>
                                </div>
                                {ev.comment && ev.comment.trim() ? (
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{ev.comment.trim()}</p>
                                ) : (
                                  <p className="mt-1.5 text-sm text-muted">작성한 심사평이 없어요.</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-2 text-xs text-muted">
                          심사위원 이름과 점수는 관리자에게만 보여요. 공개 시에는 이름·점수 없이 심사평만
                          &quot;심사위원 N&quot;으로 익명 처리돼요.
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
