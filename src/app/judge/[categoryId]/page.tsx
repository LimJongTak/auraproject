"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireJudgeOrAdmin } from "@/components/auth/Guard";
import { getCategory } from "@/lib/firestore/categories";
import { listPublishedExhibitions, setExhibitionAward } from "@/lib/firestore/exhibitions";
import { getMyEvaluation, listEvaluationsForCategory, upsertEvaluation } from "@/lib/firestore/evaluations";
import type { Category, Evaluation, Exhibition, RubricItem } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getCategory(params.categoryId).then(setCategory);
  }, [params.categoryId]);

  useEffect(() => {
    listPublishedExhibitions({ categoryId: params.categoryId, max: 500 }).then(setExhibitions);
  }, [params.categoryId]);

  if (category === undefined || exhibitions === null || !profile) return <CenteredSpinner />;
  if (category === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="대회를 찾을 수 없어요" description="삭제되었거나 존재하지 않는 대회예요." />
      </div>
    );
  }

  const rubric = category.rubric ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "평가", href: "/judge" }, { label: category.name }]} />
      <h1 className="mt-4 text-2xl font-extrabold">{category.name} 평가</h1>
      <p className="mt-1 text-sm text-muted">제출작 {exhibitions.length}개</p>

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
          {exhibitions.map((ex) => (
            <li key={ex.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex w-full items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId((cur) => (cur === ex.id ? null : ex.id))}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-bold">{ex.title}</p>
                  <p className="text-sm text-muted">{ex.teamName}</p>
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
                  <ScoreForm
                    exhibition={ex}
                    category={category}
                    rubric={rubric}
                    judgeUid={profile.uid}
                    judgeName={profile.name}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {profile.role === "admin" && rubric.length > 0 && exhibitions.length > 0 && (
        <AwardPanel categoryId={category.id} exhibitions={exhibitions} />
      )}
    </div>
  );
}

function ScoreForm({
  exhibition,
  category,
  rubric,
  judgeUid,
  judgeName,
}: {
  exhibition: Exhibition;
  category: Category;
  rubric: RubricItem[];
  judgeUid: string;
  judgeName: string;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    getMyEvaluation(judgeUid, exhibition.id).then((ev) => {
      setScores(ev?.scores ?? {});
      setComment(ev?.comment ?? "");
      setLoading(false);
    });
  }, [judgeUid, exhibition.id]);

  const groups = useMemo(() => {
    const map = new Map<string, RubricItem[]>();
    for (const item of rubric) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [rubric]);

  const total = rubric.reduce((sum, item) => sum + (scores[item.id] ?? 0), 0);
  const maxTotal = rubric.reduce((sum, item) => sum + item.maxScore, 0);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await upsertEvaluation({
        exhibitionId: exhibition.id,
        categoryId: category.id,
        judgeUid,
        judgeName,
        scores,
        totalScore: total,
        comment: comment.trim() || null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">불러오는 중...</p>;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([group, items]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-sm font-bold">{group}</p>
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted">{item.criteria}</p>
              </div>
              <input
                type="number"
                min={0}
                max={item.maxScore}
                value={scores[item.id] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(item.maxScore, parseInt(e.target.value, 10) || 0));
                  setScores((prev) => ({ ...prev, [item.id]: v }));
                }}
                className="w-16 shrink-0 rounded-lg border border-border px-2 py-1 text-right text-sm outline-none focus:border-primary"
              />
              <span className="shrink-0 text-xs text-muted">/ {item.maxScore}</span>
            </div>
          ))}
        </div>
      ))}

      <Textarea
        label="코멘트 (선택)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-20"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          합계 {total} / {maxTotal}점
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-medium text-primary">저장됨</span>}
          <Button size="sm" loading={saving} onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AwardDraft {
  preset: string;
  custom: string;
  rank: string;
}

function AwardPanel({ categoryId, exhibitions }: { categoryId: string; exhibitions: Exhibition[] }) {
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AwardDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    listEvaluationsForCategory(categoryId).then(setEvaluations);
  }, [categoryId]);

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

  if (!evaluations) return <CenteredSpinner />;

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
