import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Evaluation } from "@/types/models";

const evaluationsRef = () => collection(db, "evaluations");
const evalId = (judgeUid: string, exhibitionId: string) => `${judgeUid}_${exhibitionId}`;

export interface UpsertEvaluationInput {
  exhibitionId: string;
  categoryId: string;
  judgeUid: string;
  judgeName: string;
  scores: Record<string, number>;
  totalScore: number;
  comment: string | null;
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
