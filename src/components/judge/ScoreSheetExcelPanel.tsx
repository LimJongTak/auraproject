"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { upsertEvaluation } from "@/lib/firestore/evaluations";
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

      const rubric = category.rubric ?? [];
      for (const row of rows) {
        const existing = myEvalByExhibition.get(row.exhibitionId) ?? null;
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
        });
      }

      setResult({ ok: true, message: `${rows.length}개 작품의 점수를 반영했어요`, warnings });
    } catch {
      setResult({ ok: false, message: "엑셀 파일을 처리하는 중 문제가 발생했어요", warnings: [] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="text-sm font-bold">엑셀로 심사하기</p>
        <p className="mt-0.5 text-xs text-muted">
          심사표를 내려받아 엑셀에서 점수를 채운 뒤 그대로 업로드하면 점수가 반영돼요. 평가항목 이름에 마우스를 올리면
          채점 기준이 메모로 표시돼요.
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
