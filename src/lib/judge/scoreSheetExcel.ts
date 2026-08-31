import ExcelJS from "exceljs";
import type { Category, Evaluation, Exhibition, RubricItem } from "@/types/models";

// Sentinel written into the hidden id column for the trailing comment row,
// so upload parsing can tell it apart from a rubric item row.
const COMMENT_ROW_ID = "__comment__";

// The visible grid is one row and one column narrower than the sheet: row 1
// and column A are hidden and hold the real exhibitionId/rubric-item id for
// each column/row, so re-upload can match cells back to the right doc even
// if a judge reorders or resizes the visible columns — without cluttering
// the labels a judge actually reads with raw ids (see the screenshot this
// replaced: ids used to be appended in brackets right in the cell text).
const ID_ROW = 1;
const ID_COL = 1;
const HEADER_ROW = 2;
const LABEL_COL = 2;
const FIRST_DATA_ROW = 3;
const FIRST_DATA_COL = 3;

function itemLabelText(item: RubricItem): string {
  const group = item.group ? `${item.group} - ` : "";
  return `${group}${item.label} (배점 ${item.maxScore})`;
}

function exhibitionHeaderText(ex: Pick<Exhibition, "teamName" | "title">): string {
  return `${ex.teamName} - ${ex.title}`;
}

// Builds the downloadable score sheet: one visible column per exhibition,
// one visible row per rubric item with its 심사 기준 attached as a cell note,
// and a trailing "코멘트" row for free-text feedback. The header row and
// item-label column are both frozen so either stays in view while scrolling
// the other. Cells are pre-filled with the given judge's existing scores/
// comment so re-downloading mid-judging resumes instead of blanking out
// already-entered work.
export async function buildScoreSheetWorkbook(
  category: Category,
  exhibitions: Exhibition[],
  myEvaluations: Map<string, Evaluation>
): Promise<ArrayBuffer> {
  const rubric = category.rubric ?? [];
  const workbook = new ExcelJS.Workbook();
  const sheetName = category.name.replace(/[[\]*?/\\:]/g, "").slice(0, 28) || "심사표";
  const sheet = workbook.addWorksheet(sheetName);

  const idRow = sheet.getRow(ID_ROW);
  const headerRow = sheet.getRow(HEADER_ROW);
  headerRow.getCell(LABEL_COL).value = "평가항목";
  exhibitions.forEach((ex, i) => {
    const col = FIRST_DATA_COL + i;
    idRow.getCell(col).value = ex.id;
    headerRow.getCell(col).value = exhibitionHeaderText(ex);
  });
  headerRow.font = { bold: true };
  headerRow.alignment = { wrapText: true, vertical: "middle" };

  rubric.forEach((item, r) => {
    const row = sheet.getRow(FIRST_DATA_ROW + r);
    row.getCell(ID_COL).value = item.id;
    const labelCell = row.getCell(LABEL_COL);
    labelCell.value = itemLabelText(item);
    labelCell.note = item.criteria || "설명이 등록되어 있지 않아요";
    labelCell.font = { bold: true };
    labelCell.alignment = { wrapText: true, vertical: "middle" };

    exhibitions.forEach((ex, c) => {
      const cell = row.getCell(FIRST_DATA_COL + c);
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

  const commentRow = sheet.getRow(FIRST_DATA_ROW + rubric.length);
  commentRow.getCell(ID_COL).value = COMMENT_ROW_ID;
  commentRow.getCell(LABEL_COL).value = "코멘트";
  commentRow.getCell(LABEL_COL).font = { bold: true };
  exhibitions.forEach((ex, c) => {
    commentRow.getCell(FIRST_DATA_COL + c).value = myEvaluations.get(ex.id)?.comment ?? "";
  });

  sheet.getColumn(ID_COL).hidden = true;
  sheet.getColumn(LABEL_COL).width = 42;
  for (let i = 0; i < exhibitions.length; i++) sheet.getColumn(FIRST_DATA_COL + i).width = 22;
  idRow.hidden = true;

  sheet.views = [{ state: "frozen", xSplit: LABEL_COL, ySplit: HEADER_ROW }];

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
// the hidden id row/column rather than position or visible text — so a
// judge can freely relabel, reorder, or resize the visible columns without
// corrupting the upload, as long as whole rows/columns move together (which
// is how Excel moves them). Anything it can't match against this contest's
// current rubric/exhibitions is skipped and reported as a warning instead of
// failing the whole upload.
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
  const idRow = sheet.getRow(ID_ROW);
  const lastCol = Math.max(idRow.cellCount, sheet.getRow(HEADER_ROW).cellCount, sheet.columnCount);
  for (let c = FIRST_DATA_COL; c <= lastCol; c++) {
    const id = String(idRow.getCell(c).value ?? "").trim();
    if (!id) continue;
    if (!exhibitionIds.has(id)) {
      const label = String(sheet.getRow(HEADER_ROW).getCell(c).value ?? "").trim();
      warnings.push(`${c}번째 열의 작품을 이 대회에서 찾을 수 없어 건너뛰었어요: "${label || id}"`);
      continue;
    }
    colToExhibitionId.set(c, id);
  }

  const scoresByExhibition = new Map<string, Record<string, number>>();
  const commentsByExhibition = new Map<string, string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < FIRST_DATA_ROW) return;
    const id = String(row.getCell(ID_COL).value ?? "").trim();
    if (!id) return;
    const isCommentRow = id === COMMENT_ROW_ID;
    const item = isCommentRow ? undefined : rubricById.get(id);
    if (!isCommentRow && !item) {
      const label = String(row.getCell(LABEL_COL).value ?? "").trim();
      warnings.push(`${rowNumber}번째 행의 평가항목을 이 대회 평가표에서 찾을 수 없어 건너뛰었어요: "${label || id}"`);
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
