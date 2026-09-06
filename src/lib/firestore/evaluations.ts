import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Evaluation, EvaluationHistoryAction, EvaluationHistoryEntry, EvaluationHistorySource } from "@/types/models";

const evaluationsRef = () => collection(db, "evaluations");
const evaluationHistoryRef = () => collection(db, "evaluationHistory");
const evalId = (judgeUid: string, exhibitionId: string) => `${judgeUid}_${exhibitionId}`;

async function logEvaluationHistory(entry: {
  exhibitionId: string;
  categoryId: string;
  judgeUid: string;
  judgeName: string;
  action: EvaluationHistoryAction;
  source: EvaluationHistorySource;
  scores: Record<string, number>;
  totalScore: number;
  comment: string | null;
}): Promise<void> {
  // A history-write hiccup must never fail the caller — the real score/
  // comment write above already succeeded by the time this runs, and a
  // judge seeing "저장 실패" for a save that actually went through (because
  // only the audit-log write failed) is worse than a silently missing
  // history row. Swallow and log instead of propagating.
  try {
    await addDoc(evaluationHistoryRef(), { ...entry, createdAt: serverTimestamp() });
  } catch (err) {
    console.error("logEvaluationHistory failed", err);
  }
}

export interface UpsertEvaluationInput {
  exhibitionId: string;
  categoryId: string;
  judgeUid: string;
  judgeName: string;
  scores: Record<string, number>;
  totalScore: number;
  comment: string | null;
  // Where this write came from — shown in the admin history panel so an
  // admin can tell a hand-scored row from one that arrived via an Excel
  // re-upload. Defaults to "form" (the per-submission scoring form).
  source?: EvaluationHistorySource;
}

export async function upsertEvaluation(input: UpsertEvaluationInput): Promise<void> {
  const ref = doc(db, "evaluations", evalId(input.judgeUid, input.exhibitionId));
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      exhibitionId: input.exhibitionId,
      categoryId: input.categoryId,
      judgeUid: input.judgeUid,
      judgeName: input.judgeName,
      scores: input.scores,
      totalScore: input.totalScore,
      comment: input.comment,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logEvaluationHistory({
    exhibitionId: input.exhibitionId,
    categoryId: input.categoryId,
    judgeUid: input.judgeUid,
    judgeName: input.judgeName,
    action: existing.exists() ? "update" : "create",
    source: input.source ?? "form",
    scores: input.scores,
    totalScore: input.totalScore,
    comment: input.comment,
  });
}

// Clears a judge's own evaluation for one exhibition back to blank (scores
// and comment wiped, total reset to 0) without deleting the doc — judges
// can't delete evaluations outright (see firestore.rules), and keeping the
// doc means the history ledger below still has something to attach the
// "reset" row to. Meant as an explicit "start over" a judge can reach for
// when a batch Excel upload leaves their scores in a state they don't trust,
// rather than fighting stale merges by re-uploading again and again.
export async function resetEvaluation(input: {
  exhibitionId: string;
  categoryId: string;
  judgeUid: string;
  judgeName: string;
}): Promise<void> {
  const ref = doc(db, "evaluations", evalId(input.judgeUid, input.exhibitionId));
  const existing = await getDoc(ref);
  if (!existing.exists()) return;
  await setDoc(
    ref,
    {
      scores: {},
      totalScore: 0,
      comment: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logEvaluationHistory({
    exhibitionId: input.exhibitionId,
    categoryId: input.categoryId,
    judgeUid: input.judgeUid,
    judgeName: input.judgeName,
    action: "reset",
    source: "reset",
    scores: {},
    totalScore: 0,
    comment: null,
  });
}

// Live per-judge, per-submission score — used wherever a single judge's own
// evaluation for one exhibition needs to stay in sync across views (e.g. the
// exhibition detail page's floating scoring panel) without a manual refetch.
export function subscribeMyEvaluation(
  judgeUid: string,
  exhibitionId: string,
  cb: (evaluation: Evaluation | null) => void
) {
  return onSnapshot(
    doc(db, "evaluations", evalId(judgeUid, exhibitionId)),
    (snap) => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Evaluation) : null);
    },
    (err) => {
      // Surface a stuck permission-denied instead of leaving the caller's
      // "loading" state hanging forever with no signal (see the evaluations
      // get-rule note in firestore.rules for why this used to happen for
      // every judge on their first look at an unscored exhibition).
      console.error("subscribeMyEvaluation failed", err);
      cb(null);
    }
  );
}

// Live list of every judge's evaluations for a contest — used by the judge
// list page (per-submission "채점완료" status) and the admin award ranking
// panel, so a score entered anywhere (including the exhibition page's
// floating panel) shows up immediately in both places.
export function subscribeEvaluationsForCategory(categoryId: string, cb: (evaluations: Evaluation[]) => void) {
  const q = query(evaluationsRef(), where("categoryId", "==", categoryId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation)));
  });
}

export async function listEvaluationsForCategory(categoryId: string): Promise<Evaluation[]> {
  const snap = await getDocs(query(evaluationsRef(), where("categoryId", "==", categoryId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}

// Admin-only audit trail for one contest — every create/update/reset any
// judge has made to their evaluations, newest first. Sorted client-side
// rather than via orderBy() so this doesn't need a composite (categoryId +
// createdAt) index just for an admin-facing history panel.
export async function listEvaluationHistoryForCategory(categoryId: string): Promise<EvaluationHistoryEntry[]> {
  const snap = await getDocs(query(evaluationHistoryRef(), where("categoryId", "==", categoryId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as EvaluationHistoryEntry))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}
