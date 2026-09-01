import { ClipboardCheck } from "lucide-react";
import type { Evaluation, JudgeAssignment } from "@/types/models";
import { cn } from "@/lib/utils/cn";

interface JudgeStatusRow {
  assignment: JudgeAssignment;
  scoredCount: number;
  avgScore: number | null;
}

// Per-judge progress for one contest — how many of the submissions each
// assigned judge has scored so far, and the average total they've been
// giving. Lets an admin spot a judge who hasn't started (or is scoring
// unusually high/low) without opening every submission individually.
export function JudgingStatusPanel({
  assignments,
  evaluations,
  totalExhibitions,
}: {
  assignments: JudgeAssignment[];
  evaluations: Evaluation[];
  totalExhibitions: number;
}) {
  const rows: JudgeStatusRow[] = assignments
    .map((assignment) => {
      const evs = evaluations.filter((e) => e.judgeUid === assignment.uid);
      const avgScore = evs.length > 0 ? evs.reduce((sum, e) => sum + e.totalScore, 0) / evs.length : null;
      return { assignment, scoredCount: evs.length, avgScore };
    })
    .sort((a, b) => b.scoredCount - a.scoredCount || a.assignment.judgeName.localeCompare(b.assignment.judgeName));

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-primary" />
        <h2 className="font-bold">심사위원별 심사 현황</h2>
      </div>
      <p className="mt-1 text-sm text-muted">지정된 심사위원이 제출작 {totalExhibitions}개 중 몇 개를 채점했는지 확인해요.</p>

      {assignments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">아직 지정된 심사위원이 없어요. 아래에서 먼저 심사위원을 지정해주세요.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {rows.map(({ assignment, scoredCount, avgScore }) => {
            const pct = totalExhibitions > 0 ? Math.round((scoredCount / totalExhibitions) * 100) : 0;
            const done = totalExhibitions > 0 && scoredCount >= totalExhibitions;
            return (
              <li key={assignment.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{assignment.judgeName}</p>
                    {assignment.isTemporary && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">임시</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className={cn("font-semibold", done ? "text-primary" : "text-foreground")}>
                      {scoredCount}/{totalExhibitions} 채점
                    </span>
                    {avgScore != null && <span>평균 {avgScore.toFixed(1)}점</span>}
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={cn("h-full rounded-full transition-all", done ? "bg-primary" : "bg-primary/60")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
