"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCategory } from "@/lib/firestore/categories";
import { subscribeMyEvaluation } from "@/lib/firestore/evaluations";
import { getSubmissionWindowState } from "@/lib/utils/dateWindow";
import type { Category, Evaluation, Exhibition } from "@/types/models";
import { RubricScoreForm } from "@/components/judge/RubricScoreForm";
import { cn } from "@/lib/utils/cn";

// Lets a judge/admin score a submission without leaving the page they're
// viewing it on — a floating card rather than a full-page form, so the work
// itself (PDF pages, comments, etc.) stays visible while scoring.
export function JudgeFloatingScorePanel({ exhibition }: { exhibition: Exhibition }) {
  const { profile } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [myEvaluation, setMyEvaluation] = useState<Evaluation | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const canJudge = profile?.role === "admin" || profile?.role === "judge";

  useEffect(() => {
    if (!canJudge) return;
    getCategory(exhibition.categoryId).then(setCategory);
  }, [canJudge, exhibition.categoryId]);

  useEffect(() => {
    if (!canJudge || !profile) return;
    const unsub = subscribeMyEvaluation(profile.uid, exhibition.id, setMyEvaluation);
    return () => unsub();
  }, [canJudge, profile, exhibition.id]);

  if (!canJudge || !profile || !category) return null;

  const rubric = category.rubric ?? [];
  const windowState = getSubmissionWindowState(category.submissionOpenAt, category.submissionCloseAt);
  if (rubric.length === 0 || windowState !== "closed") return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5",
              myEvaluation ? "bg-primary-dark" : "bg-primary"
            )}
          >
            <ClipboardCheck size={18} />
            {myEvaluation ? `평가완료 · ${myEvaluation.totalScore}점 · 수정하기` : "이 작품 평가하기"}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-40 flex max-h-[75vh] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{exhibition.title}</p>
                <p className="text-xs text-muted">작품을 보면서 바로 평가할 수 있어요</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="평가 패널 닫기"
                className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {myEvaluation === undefined ? (
                <p className="text-sm text-muted">불러오는 중...</p>
              ) : (
                <RubricScoreForm
                  exhibitionId={exhibition.id}
                  categoryId={category.id}
                  rubric={rubric}
                  judgeUid={profile.uid}
                  judgeName={profile.name}
                  initial={myEvaluation}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
