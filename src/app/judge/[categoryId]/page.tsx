"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireJudgeOrAdmin } from "@/components/auth/Guard";
import { getCategory } from "@/lib/firestore/categories";
import { listPublishedExhibitions, setExhibitionAward } from "@/lib/firestore/exhibitions";
import { subscribeEvaluationsForCategory } from "@/lib/firestore/evaluations";
import { getAssignment } from "@/lib/firestore/judgeAssignments";
import { RubricScoreForm } from "@/components/judge/RubricScoreForm";
import { ScoreSheetExcelPanel } from "@/components/judge/ScoreSheetExcelPanel";
import { JudgeAssignmentPanel } from "@/components/admin/JudgeAssignmentPanel";
import type { Category, Evaluation, Exhibition, JudgeAssignment } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Only meaningful for role == 'judge' — undefined while loading, null once
  // confirmed the caller isn't assigned to this contest. Admins skip this
  // check entirely (see the gate below).
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "평가", href: "/judge" }, { label: category.name }]} />
      <h1 className="mt-4 text-2xl font-extrabold">{category.name} 평가</h1>
      <p className="mt-1 text-sm text-muted">제출작 {exhibitions.length}개</p>

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
        <ul className="mt-6 flex flex-col gap-3">
          {exhibitions.map((ex) => {
            const myEval = myEvalByExhibition.get(ex.id) ?? null;
            return (
              <li key={ex.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId((cur) => (cur === ex.id ? null : ex.id))}
                    className="min-w-0 flex-1 text-left"
                  >
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
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/exhibitions/${ex.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                    >
                      <ExternalLink size={13} /> 작품 보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => setExpandedId((cur) => (cur === ex.id ? null : ex.id))}
                      aria-label={expandedId === ex.id ? "접기" : "펼치기"}
                    >
                      {expandedId === ex.id ? (
                        <ChevronUp size={18} className="shrink-0 text-muted" />
                      ) : (
                        <ChevronDown size={18} className="shrink-0 text-muted" />
                      )}
                    </button>
                  </div>
                </div>
                {expandedId === ex.id && (
                  <div className="mt-4 border-t border-border pt-4">
                    <RubricScoreForm
                      exhibitionId={ex.id}
                      categoryId={category.id}
                      rubric={rubric}
                      judgeUid={profile.uid}
                      judgeName={profile.name}
                      initial={myEval}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {profile.role === "admin" && evaluations && rubric.length > 0 && exhibitions.length > 0 && (
        <AwardPanel exhibitions={exhibitions} evaluations={evaluations} />
      )}

      {profile.role === "admin" && <JudgeAssignmentPanel categoryId={category.id} categoryName={category.name} />}
    </div>
  );
}

interface AwardDraft {
  preset: string;
  custom: string;
  rank: string;
}

function AwardPanel({ exhibitions, evaluations }: { exhibitions: Exhibition[]; evaluations: Evaluation[] }) {
  const [drafts, setDrafts] = useState<Record<string, AwardDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-5">
      <h2 className="font-bold">수상작 지정</h2>
      <p className="mt-1 text-sm text-muted">심사위원 평균 점수 기준으로 정렬돼요. 관리자에게만 보여요.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 pr-4 font-semibold">순위</th>
              <th className="py-2 pr-4 font-semibold">작품</th>
              <th className="py-2 pr-4 font-semibold">평균점수</th>
              <th className="py-2 pr-4 font-semibold">수상 지정</th>
              <th className="py-2 pr-4 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => {
              const draft = drafts[row.exhibition.id] ?? { preset: "", custom: "", rank: "" };
              return (
                <tr key={row.exhibition.id} className="border-b border-border last:border-0 align-top">
                  <td className="py-3 pr-4">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.exhibition.title}</p>
                    <p className="text-xs text-muted">{row.exhibition.teamName}</p>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
