import ExcelJS from "exceljs";
import type { Category, Evaluation, Exhibition, JudgeAssignment } from "@/types/models";

function sheetSafeName(name: string, fallback: string): string {
  return name.replace(/[[\]*?/\\:]/g, "").slice(0, 28) || fallback;
}

interface RankedExhibition {
  exhibition: Exhibition;
  avgScore: number;
  judgeCount: number;
}

function rankExhibitions(exhibitions: Exhibition[], byExhibition: Map<string, Evaluation[]>): RankedExhibition[] {
  return exhibitions
    .map((exhibition) => {
      const evs = byExhibition.get(exhibition.id) ?? [];
      const avgScore = evs.length > 0 ? evs.reduce((sum, e) => sum + e.totalScore, 0) / evs.length : 0;
      return { exhibition, avgScore, judgeCount: evs.length };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

// One workbook per contest with three views: a ranked summary with one score
// column per assigned judge (for a quick "who scored what" read), a per-judge
// progress sheet (for the same judging-status panel shown in the admin UI),
// and a flat per-item breakdown (for anyone who needs to dig into individual
// rubric scores/comments rather than just totals).
export async function buildJudgingResultsWorkbook(
  category: Category,
  exhibitions: Exhibition[],
  evaluations: Evaluation[],
  assignments: JudgeAssignment[]
): Promise<ArrayBuffer> {
  const rubric = category.rubric ?? [];
  const workbook = new ExcelJS.Workbook();

  const byExhibition = new Map<string, Evaluation[]>();
  for (const ev of evaluations) {
    const list = byExhibition.get(ev.exhibitionId) ?? [];
    list.push(ev);
    byExhibition.set(ev.exhibitionId, list);
  }
  const ranked = rankExhibitions(exhibitions, byExhibition);

  // Judges in a stable order (assignment creation order), including anyone
  // who scored but no longer has an active assignment, so a removed judge's
  // past scores still show up instead of silently vanishing from the report.
  const judgeNames = new Map<string, string>();
  for (const a of assignments) judgeNames.set(a.uid, a.judgeName);
  for (const ev of evaluations) if (!judgeNames.has(ev.judgeUid)) judgeNames.set(ev.judgeUid, ev.judgeName);
  const judgeUids = [
    ...assignments.map((a) => a.uid),
    ...[...judgeNames.keys()].filter((uid) => !assignments.some((a) => a.uid === uid)),
  ];

  const summarySheet = workbook.addWorksheet(sheetSafeName(`${category.name}_종합결과`, "종합결과"));
  const summaryHeader = [
    "순위",
    "팀명",
    "작품명",
    "평균점수",
    "심사인원",
    ...judgeUids.map((uid) => judgeNames.get(uid) ?? uid),
    "수상",
    "인기상순위",
  ];
  summarySheet.addRow(summaryHeader).font = { bold: true };
  ranked.forEach((row, i) => {
    const evs = byExhibition.get(row.exhibition.id) ?? [];
    const scoreByJudge = new Map(evs.map((e) => [e.judgeUid, e.totalScore]));
    summarySheet.addRow([
      i + 1,
      row.exhibition.teamName,
      row.exhibition.title,
      Number(row.avgScore.toFixed(1)),
      row.judgeCount,
      ...judgeUids.map((uid) => scoreByJudge.get(uid) ?? null),
      row.exhibition.award ? `${row.exhibition.award.label} (${row.exhibition.award.rank}위)` : "",
      row.exhibition.popularAwardRank ?? "",
    ]);
  });
  summarySheet.columns.forEach((col, i) => {
    col.width = i === 2 ? 32 : i === 1 ? 20 : 14;
  });
  summarySheet.views = [{ state: "frozen", ySplit: 1 }];

  const statusSheet = workbook.addWorksheet(sheetSafeName(`${category.name}_심사위원현황`, "심사위원현황"));
  statusSheet.addRow(["심사위원", "임시계정", "채점 완료", "배정 작품 수", "진행률", "평균 부여 점수"]).font = {
    bold: true,
  };
  const assignmentsByUid = new Map(assignments.map((a) => [a.uid, a]));
  for (const uid of judgeUids) {
    const evs = evaluations.filter((e) => e.judgeUid === uid);
    const assignment = assignmentsByUid.get(uid);
    const avg = evs.length > 0 ? evs.reduce((sum, e) => sum + e.totalScore, 0) / evs.length : null;
    statusSheet.addRow([
      judgeNames.get(uid) ?? uid,
      assignment?.isTemporary ? "Y" : "",
      evs.length,
      exhibitions.length,
      exhibitions.length > 0 ? `${Math.round((evs.length / exhibitions.length) * 100)}%` : "-",
      avg != null ? Number(avg.toFixed(1)) : null,
    ]);
  }
  statusSheet.columns.forEach((col) => (col.width = 18));
  statusSheet.views = [{ state: "frozen", ySplit: 1 }];

  const detailSheet = workbook.addWorksheet(sheetSafeName(`${category.name}_세부내역`, "세부내역"));
  detailSheet.addRow(["팀명", "작품명", "심사위원", ...rubric.map((r) => `${r.group ? `${r.group} - ` : ""}${r.label}`), "합계", "코멘트"]).font = {
    bold: true,
  };
  for (const row of ranked) {
    const evs = (byExhibition.get(row.exhibition.id) ?? []).slice().sort((a, b) => a.judgeName.localeCompare(b.judgeName));
    for (const ev of evs) {
      detailSheet.addRow([
        row.exhibition.teamName,
        row.exhibition.title,
        ev.judgeName,
        ...rubric.map((r) => ev.scores?.[r.id] ?? null),
        ev.totalScore,
        ev.comment ?? "",
      ]);
    }
  }
  detailSheet.columns.forEach((col, i) => {
    col.width = i === 1 ? 28 : i === rubric.length + 5 ? 40 : 16;
  });
  detailSheet.views = [{ state: "frozen", ySplit: 1 }];

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
