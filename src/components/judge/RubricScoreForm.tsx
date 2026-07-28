"use client";

import { useMemo, useState } from "react";
import { upsertEvaluation } from "@/lib/firestore/evaluations";
import type { Evaluation, RubricItem } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

export function RubricScoreForm({
  exhibitionId,
  categoryId,
  rubric,
  judgeUid,
  judgeName,
  initial,
}: {
  exhibitionId: string;
  categoryId: string;
  rubric: RubricItem[];
  judgeUid: string;
  judgeName: string;
  // Seeds the form once on mount — the caller is expected to remount this
  // component (e.g. via a `key`) if it wants a different judge's evaluation
  // reflected, so live updates never clobber an in-progress edit.
  initial: Evaluation | null;
}) {
  const [scores, setScores] = useState<Record<string, number>>(initial?.scores ?? {});
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        exhibitionId,
        categoryId,
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
