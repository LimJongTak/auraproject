"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { listEvaluationsForCategory, resetEvaluation, upsertEvaluation } from "@/lib/firestore/evaluations";
import { buildScoreSheetWorkbook, parseScoreSheetWorkbook } from "@/lib/judge/scoreSheetExcel";
import type { Category, Evaluation, Exhibition } from "@/types/models";
import { Button } from "@/components/ui/Button";

export function ScoreSheetExcelPanel({
  category,
  exhibitions,
  myEvalByExhibition,
  judgeUid,
  judgeName,
}: {
  category: Category;
  exhibitions: Exhibition[];
  myEvalByExhibition: Map<string, Evaluation>;
  judgeUid: string;
  judgeName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; warnings: string[] } | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setResult(null);
    try {
      const buffer = await buildScoreSheetWorkbook(category, exhibitions, myEvalByExhibition);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${category.name}_심사표.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setResult({ ok: false, message: "심사표를 만드는 중 문제가 발생했어요", warnings: [] });
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const { rows, warnings } = await parseScoreSheetWorkbook(buffer, category, exhibitions);
      if (rows.length === 0) {
        setResult({ ok: false, message: "반영할 점수를 찾지 못했어요. 다운로드한 심사표 양식을 그대로 사용했는지 확인해주세요.", warnings });
        return;
      }

      // Re-fetch this judge's current evaluations right before merging,
      // rather than trusting the myEvalByExhibition prop — that prop can be
      // stale on a retry (e.g. right after a previous upload in the same
      // session), and merging a row's new scores onto stale existing scores
      // can resurrect values the judge thought they'd already overwritten.
      const freshEvaluations = await listEvaluationsForCategory(category.id);
      const freshByExhibition = new Map(
        freshEvaluations.filter((ev) => ev.judgeUid === judgeUid).map((ev) => [ev.exhibitionId, ev])
      );

      const rubric = category.rubric ?? [];
      const rowWarnings: string[] = [];
      let successCount = 0;
      for (const row of rows) {
        const exhibition = exhibitions.find((ex) => ex.id === row.exhibitionId);
        try {
          const existing = freshByExhibition.get(row.exhibitionId) ?? null;
          // Blank cells in the upload mean "unchanged", so merge onto whatever
          // this judge already had rather than replacing the whole map — see
          // parseScoreSheetWorkbook's ParsedScoreSheetRow doc comment.
          const mergedScores = { ...(existing?.scores ?? {}), ...row.scores };
          const totalScore = rubric.reduce((sum, item) => sum + (mergedScores[item.id] ?? 0), 0);
          await upsertEvaluation({
            exhibitionId: row.exhibitionId,
            categoryId: category.id,
            judgeUid,
            judgeName,
            scores: mergedScores,
            totalScore,
            comment: row.comment ?? existing?.comment ?? null,
            source: "excel",
          });
          successCount += 1;
        } catch (err) {
          // Keep going on the remaining rows instead of aborting the whole
          // batch — a judge retrying an upload after a partial failure
          // otherwise has no way to tell which rows actually went through.
          const message = err instanceof Error ? err.message : String(err);
          rowWarnings.push(`"${exhibition?.title ?? row.exhibitionId}" 반영에 실패했어요: ${message}`);
        }
      }

      setResult({
        ok: successCount > 0,
        message:
          successCount === rows.length
            ? `${successCount}개 작품의 점수를 반영했어요`
            : `${rows.length}개 중 ${successCount}개만 반영됐어요. 실패한 작품은 아래를 확인하고 다시 시도해주세요.`,
        warnings: [...warnings, ...rowWarnings],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, message: `엑셀 파일을 처리하는 중 문제가 발생했어요: ${message}`, warnings: [] });
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    const scoredIds = exhibitions.filter((ex) => myEvalByExhibition.has(ex.id)).map((ex) => ex.id);
    if (scoredIds.length === 0) return;
    if (!confirm(`내가 매긴 점수 ${scoredIds.length}건을 모두 초기화할까요? 되돌릴 수 없어요.`)) return;

    setResetting(true);
    setResult(null);
    try {
      for (const exhibitionId of scoredIds) {
        await resetEvaluation({ exhibitionId, categoryId: category.id, judgeUid, judgeName });
      }
      setResult({ ok: true, message: `${scoredIds.length}건의 점수를 초기화했어요. 심사표를 새로 내려받아 다시 채점해주세요.`, warnings: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, message: `초기화 중 문제가 발생했어요: ${message}`, warnings: [] });
    } finally {
      setResetting(false);
    }
  }

  const hasMyScores = exhibitions.some((ex) => myEvalByExhibition.has(ex.id));

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="text-sm font-bold">엑셀로 심사하기</p>
        <p className="mt-0.5 text-xs text-muted">
          심사표를 내려받아 엑셀에서 점수를 채운 뒤 그대로 업로드하면 점수가 반영돼요. 평가항목 이름에 마우스를 올리면
          채점 기준이 메모로 표시돼요. 업로드가 꼬였다면 초기화 후 다시 시도해주세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" loading={downloading} onClick={handleDownload}>
          <Download size={14} /> 심사표 내려받기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} /> 채점 결과 업로드
        </Button>
        {hasMyScores && (
          <Button type="button" variant="outline" size="sm" loading={resetting} onClick={handleReset}>
            <RotateCcw size={14} /> 내 점수 초기화
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
      {result && (
        <div className="flex flex-col gap-1">
          <p className={result.ok ? "text-xs font-semibold text-primary" : "text-xs font-semibold text-red-600"}>
            {result.message}
          </p>
          {result.warnings.length > 0 && (
            <ul className="list-disc pl-4 text-xs text-muted">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
