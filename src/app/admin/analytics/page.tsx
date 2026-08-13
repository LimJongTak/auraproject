"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { listAllVisitStats } from "@/lib/firestore/visits";
import {
  bucketizeVisitStats,
  CURRENT_PERIOD_LABEL,
  PERIOD_LABEL,
  type VisitPeriod,
} from "@/lib/utils/visitBuckets";
import type { VisitStat } from "@/types/models";
import { CenteredSpinner } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const PERIODS: VisitPeriod[] = ["day", "week", "month", "year"];

// Evenly spaces points across the plot with a small edge margin so the
// first/last dots and labels don't get clipped by the container edge.
function lineX(index: number, total: number): number {
  if (total <= 1) return 50;
  return 2 + (index / (total - 1)) * 96;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<VisitStat[] | null>(null);
  const [period, setPeriod] = useState<VisitPeriod>("day");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    listAllVisitStats().then(setStats);
  }, []);

  const buckets = useMemo(() => (stats ? bucketizeVisitStats(stats, period) : []), [stats, period]);
  // The most recent bucket is the current one — today for "day", this week
  // for "week", etc. — as opposed to windowTotal, which sums every bucket
  // currently on screen (last 14 days / 12 weeks / 12 months / 5 years).
  const current = buckets[buckets.length - 1]?.count ?? 0;
  const windowTotal = buckets.reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  function handleExport() {
    const rows = buckets.map((b) => ({ 기간: b.label, 방문자수: b.count }));
    rows.push({ 기간: "합계", 방문자수: windowTotal });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, PERIOD_LABEL[period]);
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `방문자수_${PERIOD_LABEL[period]}_${today}.xlsx`);
  }

  return (
    <div>
      <AdminPageHeader
        title="방문자 통계"
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!stats || buckets.length === 0}>
            <Download size={14} /> 엑셀로 출력
          </Button>
        }
      />

      <div className="flex gap-2 rounded-full bg-surface p-1 text-sm">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 font-semibold transition",
              period === p ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {stats === null ? (
        <CenteredSpinner />
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <p className="text-sm text-muted">{CURRENT_PERIOD_LABEL[period]} 방문자 수</p>
            <p className="mt-1 text-3xl font-extrabold">{current.toLocaleString()}명</p>
            <p className="mt-1 text-xs text-muted">
              {buckets[0]?.start} ~ {buckets[buckets.length - 1]?.end} 합계 {windowTotal.toLocaleString()}명
            </p>

            <div className="mt-8">
              <div className="relative h-48 w-full">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-t border-dashed border-border" />
                  ))}
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    points={buckets
                      .map((b, i) => `${lineX(i, buckets.length)},${100 - (b.count / max) * 100}`)
                      .join(" ")}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {buckets.map((b, i) => (
                  <div
                    key={b.start}
                    className="absolute -translate-x-1/2 translate-y-1/2 cursor-default"
                    style={{ left: `${lineX(i, buckets.length)}%`, bottom: `${(b.count / max) * 100}%` }}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
                  >
                    {hoverIndex === i && (
                      <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-semibold text-white shadow">
                        {b.label} · {b.count.toLocaleString()}명
                      </div>
                    )}
                    <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  </div>
                ))}
              </div>
              <div className="relative mt-2 h-4 w-full">
                {buckets.map((b, i) => (
                  <span
                    key={b.start}
                    className="absolute -translate-x-1/2 truncate text-[11px] text-muted"
                    style={{ left: `${lineX(i, buckets.length)}%` }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-5 py-3 font-semibold">기간</th>
                  <th className="px-5 py-3 font-semibold">방문자 수</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.start} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5">{b.label}</td>
                    <td className="px-5 py-2.5">{b.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
