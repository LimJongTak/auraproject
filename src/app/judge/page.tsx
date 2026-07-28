"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireJudgeOrAdmin } from "@/components/auth/Guard";
import { subscribeCategories } from "@/lib/firestore/categories";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { listEvaluationsForCategory } from "@/lib/firestore/evaluations";
import { getSubmissionWindowState } from "@/lib/utils/dateWindow";
import type { Category } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";

interface JudgeCategoryRow {
  category: Category;
  publishedCount: number;
  myScoredCount: number;
}

export default function JudgePage() {
  return (
    <RequireJudgeOrAdmin>
      <JudgeCategoryList />
    </RequireJudgeOrAdmin>
  );
}

function JudgeCategoryList() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [rows, setRows] = useState<JudgeCategoryRow[] | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!categories || !profile) return;
    const closed = categories.filter(
      (c) => getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt) === "closed"
    );
    Promise.all(
      closed.map(async (category) => {
        const [exhibitions, evaluations] = await Promise.all([
          listPublishedExhibitions({ categoryId: category.id, max: 500 }),
          listEvaluationsForCategory(category.id),
        ]);
        return {
          category,
          publishedCount: exhibitions.length,
          myScoredCount: evaluations.filter((e) => e.judgeUid === profile.uid).length,
        };
      })
    ).then(setRows);
  }, [categories, profile]);

  if (!categories || !rows) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "평가" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">대회 평가</h1>
      <p className="mt-1 text-sm text-muted">접수가 마감된 대회의 제출작을 채점할 수 있어요.</p>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="채점할 대회가 없어요" description="접수가 마감된 대회가 생기면 여기에 표시돼요." />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.category.id}>
              <Link
                href={`/judge/${row.category.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <p className="font-bold">{row.category.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    제출작 {row.publishedCount}개 · 내가 채점함 {row.myScoredCount}개
                  </p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
