import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
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

export async function getMyEvaluation(judgeUid: string, exhibitionId: string): Promise<Evaluation | null> {
  const snap = await getDoc(doc(db, "evaluations", evalId(judgeUid, exhibitionId)));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Evaluation) : null;
}

export async function listEvaluationsForCategory(categoryId: string): Promise<Evaluation[]> {
  const snap = await getDocs(query(evaluationsRef(), where("categoryId", "==", categoryId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}

export async function listEvaluationsForExhibition(exhibitionId: string): Promise<Evaluation[]> {
  const snap = await getDocs(query(evaluationsRef(), where("exhibitionId", "==", exhibitionId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}
