import ExcelJS from "exceljs";
import type { Category, Evaluation, Exhibition, RubricItem } from "@/types/models";

// Sentinel written into the first cell of the trailing comment row so upload
// parsing can tell it apart from a rubric item row using the same [id]
// convention (see extractId below) instead of matching on the visible label
// text, which a judge might retype.
const COMMENT_ROW_ID = "__comment__";

// Every header cell (row 1 = which exhibition, column 1 = which rubric item)
// carries its real id in a trailing "[...]" so re-upload can match rows/
// columns back to the right doc even if a judge reorders, resizes, or
// retranslates the visible label — only the bracketed id has to survive.
const ID_SUFFIX_RE = /\[([^[\]]+)\]\s*$/;

function extractId(text: string): string | null {
  const m = ID_SUFFIX_RE.exec(text.trim());
  return m ? m[1] : null;
}

function itemHeaderText(item: RubricItem): string {
  const group = item.group ? `${item.group} - ` : "";
  return `${group}${item.label} (배점 ${item.maxScore}) [${item.id}]`;
}

function exhibitionHeaderText(ex: Pick<Exhibition, "id" | "teamName" | "title">): string {
  return `${ex.teamName} - ${ex.title} [${ex.id}]`;
}

// Builds the downloadable score sheet: row 1 is one column per exhibition,
// column 1 (frozen, along with the header row) is one row per rubric item
// with its 심사 기준 attached as a cell note, and a trailing "코멘트" row for
// free-text feedback. Cells are pre-filled with the given judge's existing
// scores/comment so re-downloading mid-judging resumes instead of blanking
// out already-entered work.
export async function buildScoreSheetWorkbook(
  category: Category,
  exhibitions: Exhibition[],
  myEvaluations: Map<string, Evaluation>
): Promise<ArrayBuffer> {
  const rubric = category.rubric ?? [];
  const workbook = new ExcelJS.Workbook();
  const sheetName = category.name.replace(/[[\]*?/\\:]/g, "").slice(0, 28) || "심사표";
  const sheet = workbook.addWorksheet(sheetName);

  const headerRow = sheet.getRow(1);
  headerRow.getCell(1).value = "평가항목";
  exhibitions.forEach((ex, i) => {
    headerRow.getCell(i + 2).value = exhibitionHeaderText(ex);
  });
  headerRow.font = { bold: true };
  headerRow.alignment = { wrapText: true, vertical: "middle" };

  rubric.forEach((item, r) => {
    const row = sheet.getRow(r + 2);
    const labelCell = row.getCell(1);
    labelCell.value = itemHeaderText(item);
    labelCell.note = item.criteria || "설명이 등록되어 있지 않아요";
    labelCell.font = { bold: true };
    labelCell.alignment = { wrapText: true, vertical: "middle" };

    exhibitions.forEach((ex, c) => {
      const cell = row.getCell(c + 2);
      const score = myEvaluations.get(ex.id)?.scores?.[item.id];
      cell.value = typeof score === "number" ? score : null;
      cell.dataValidation = {
        type: "whole",
        operator: "between",
        formulae: [0, item.maxScore],
        showErrorMessage: true,
        errorTitle: "점수 범위 오류",
        error: `0 ~ ${item.maxScore} 사이의 정수만 입력할 수 있어요`,
      };
    });
  });

  const commentRow = sheet.getRow(rubric.length + 2);
  commentRow.getCell(1).value = `코멘트 [${COMMENT_ROW_ID}]`;
  commentRow.getCell(1).font = { bold: true };
  exhibitions.forEach((ex, c) => {
    commentRow.getCell(c + 2).value = myEvaluations.get(ex.id)?.comment ?? "";
  });

  sheet.getColumn(1).width = 42;
  for (let i = 0; i < exhibitions.length; i++) sheet.getColumn(i + 2).width = 22;

  // Freezes both the header row and the item-label column so either axis
  // stays in view while scrolling the other — the app asked for the column,
  // freezing the header row alongside it is the natural companion for a
  // matrix this shape.
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

export interface ParsedScoreSheetRow {
  exhibitionId: string;
  // Only rubric items whose cell actually had a value in the file — a blank
  // cell means "leave this item's existing score untouched", not "set it to
  // zero", so callers should merge this onto any prior scores rather than
  // replace them outright.
  scores: Record<string, number>;
  // null means the comment cell was blank — same "leave untouched" rule.
  comment: string | null;
}

export interface ParseScoreSheetResult {
  rows: ParsedScoreSheetRow[];
  warnings: string[];
}

// Reads a workbook produced by (or shaped like) buildScoreSheetWorkbook back
// into per-exhibition score/comment updates, matching rows and columns by
// their bracketed ids rather than position — so a judge can freely reorder
// or resize columns without corrupting the upload. Anything it can't match
// against this contest's current rubric/exhibitions is skipped and reported
// as a warning instead of failing the whole upload.
export async function parseScoreSheetWorkbook(
  buffer: ArrayBuffer,
  category: Category,
  exhibitions: Exhibition[]
): Promise<ParseScoreSheetResult> {
  const rubric = category.rubric ?? [];
  const rubricById = new Map(rubric.map((item) => [item.id, item]));
  const exhibitionIds = new Set(exhibitions.map((ex) => ex.id));
  const warnings: string[] = [];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], warnings: ["엑셀 파일에서 시트를 찾을 수 없어요"] };

  const colToExhibitionId = new Map<number, string>();
  const headerRow = sheet.getRow(1);
  const lastCol = Math.max(headerRow.cellCount, sheet.columnCount);
  for (let c = 2; c <= lastCol; c++) {
    const text = String(headerRow.getCell(c).value ?? "").trim();
    if (!text) continue;
    const id = extractId(text);
    if (!id || !exhibitionIds.has(id)) {
      warnings.push(`${c}번째 열의 작품을 이 대회에서 찾을 수 없어 건너뛰었어요: "${text}"`);
      continue;
    }
    colToExhibitionId.set(c, id);
  }

  const scoresByExhibition = new Map<string, Record<string, number>>();
  const commentsByExhibition = new Map<string, string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const labelText = String(row.getCell(1).value ?? "").trim();
    if (!labelText) return;
    const id = extractId(labelText);
    const isCommentRow = id === COMMENT_ROW_ID;
    const item = id && !isCommentRow ? rubricById.get(id) : undefined;
    if (!isCommentRow && !item) {
      warnings.push(`${rowNumber}번째 행의 평가항목을 이 대회 평가표에서 찾을 수 없어 건너뛰었어요: "${labelText}"`);
      return;
    }

    for (const [col, exhibitionId] of colToExhibitionId) {
      const raw = row.getCell(col).value;
      if (raw == null || raw === "") continue;

      if (isCommentRow) {
        const text = String(raw).trim();
        if (text) commentsByExhibition.set(exhibitionId, text);
        continue;
      }

      const n = Number(raw);
      if (!Number.isFinite(n)) {
        warnings.push(`"${item!.label}" 항목의 점수가 숫자가 아니에요 (${exhibitionId}): "${raw}"`);
        continue;
      }
      const clamped = Math.max(0, Math.min(item!.maxScore, Math.round(n)));
      const scores = scoresByExhibition.get(exhibitionId) ?? {};
      scores[item!.id] = clamped;
      scoresByExhibition.set(exhibitionId, scores);
    }
  });

  const touchedIds = new Set([...scoresByExhibition.keys(), ...commentsByExhibition.keys()]);
  const rows: ParsedScoreSheetRow[] = Array.from(touchedIds, (exhibitionId) => ({
    exhibitionId,
    scores: scoresByExhibition.get(exhibitionId) ?? {},
    comment: commentsByExhibition.get(exhibitionId) ?? null,
  }));

  return { rows, warnings };
}
