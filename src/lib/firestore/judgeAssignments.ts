import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { setUserRole } from "@/lib/firestore/users";
import type { JudgeAssignment } from "@/types/models";

const assignmentsRef = () => collection(db, "judgeAssignments");
const assignmentId = (uid: string, categoryId: string) => `${uid}_${categoryId}`;

export async function listAssignmentsForCategory(categoryId: string): Promise<JudgeAssignment[]> {
  const snap = await getDocs(query(assignmentsRef(), where("categoryId", "==", categoryId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JudgeAssignment));
}

export async function listAssignmentsForUser(uid: string): Promise<JudgeAssignment[]> {
  const snap = await getDocs(query(assignmentsRef(), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JudgeAssignment));
}

export async function getAssignment(uid: string, categoryId: string): Promise<JudgeAssignment | null> {
  const snap = await getDoc(doc(db, "judgeAssignments", assignmentId(uid, categoryId)));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as JudgeAssignment) : null;
}

// Assigning also grants the global 'judge' role if the user doesn't already
// have it — evaluations rules require both role == 'judge' *and* a matching
// assignment doc, so a plain 'user' assigned here couldn't actually judge yet.
export async function assignJudgeToCategory(input: {
  uid: string;
  categoryId: string;
  categoryName: string;
  judgeName: string;
}): Promise<void> {
  await setUserRole(input.uid, "judge");
  await setDoc(doc(db, "judgeAssignments", assignmentId(input.uid, input.categoryId)), {
    uid: input.uid,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    judgeName: input.judgeName,
    isTemporary: false,
    createdAt: serverTimestamp(),
  });
}

// Removing someone's last assignment also drops their global 'judge' role,
// so admin/users.tsx doesn't keep showing a judge with no contest left to
// actually judge. Only touches the role — never deletes the account itself
// (use revokeTempJudgeAccount for that, and only for bulk-issued accounts).
export async function unassignJudge(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(db, "judgeAssignments", assignmentId(uid, categoryId)));
  const remaining = await listAssignmentsForUser(uid);
  if (remaining.length === 0) {
    await setUserRole(uid, "user");
  }
}
