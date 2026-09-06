"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { listEvaluationHistoryForCategory } from "@/lib/firestore/evaluations";
import type { EvaluationHistoryEntry, Exhibition } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const ACTION_LABEL: Record<EvaluationHistoryEntry["action"], { label: string; className: string }> = {
  create: { label: "채점", className: "bg-primary-light text-primary-dark" },
  update: { label: "수정", className: "bg-blue-50 text-blue-700" },
  reset: { label: "초기화", className: "bg-red-50 text-red-600" },
};

const SOURCE_LABEL: Record<EvaluationHistoryEntry["source"], string> = {
  form: "개별 심사",
  excel: "엑셀 업로드",
  reset: "초기화",
};

// Admin-only audit trail for one contest's evaluations — every create/
// update/reset any judge has made, newest first, so an admin can see exactly
// what a judge changed (and how — by hand vs. via an Excel re-upload) without
// having to take anyone's word for it.
export function EvaluationHistoryPanel({ categoryId, exhibitions }: { categoryId: string; exhibitions: Exhibition[] }) {
  const [entries, setEntries] = useState<EvaluationHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const titleById = new Map(exhibitions.map((ex) => [ex.id, ex.title]));

  async function load() {
    setLoading(true);
    try {
      setEntries(await listEvaluationHistoryForCategory(categoryId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && entries === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          <History size={18} className="text-primary" />
          <div>
            <h2 className="font-bold">갱신 이력</h2>
            <p className="mt-0.5 text-xs text-muted">심사위원이 채점을 저장·수정·초기화한 기록이에요. 클릭해서 펼쳐보세요.</p>
          </div>
        </button>
        {open && (
          <Button type="button" variant="outline" size="sm" loading={loading} onClick={load}>
            <RefreshCw size={14} /> 새로고침
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 max-h-[32rem] overflow-y-auto">
          {entries === null || loading ? (
            <p className="text-sm text-muted">불러오는 중...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted">아직 기록이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => {
                const action = ACTION_LABEL[entry.action];
                return (
                  <li key={entry.id} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", action.className)}>
                        {action.label}
                      </span>
                      <span className="font-semibold">{entry.judgeName}</span>
                      <span className="text-muted">·</span>
                      <span className="truncate text-muted">{titleById.get(entry.exhibitionId) ?? entry.exhibitionId}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted">
                        {SOURCE_LABEL[entry.source]} · {entry.createdAt ? entry.createdAt.toDate().toLocaleString("ko-KR") : "-"}
                      </span>
                    </div>
                    {entry.action !== "reset" && (
                      <p className="mt-1 text-xs text-muted">
                        총점 {entry.totalScore}점{entry.comment ? ` · "${entry.comment}"` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
