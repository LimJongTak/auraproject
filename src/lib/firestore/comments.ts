import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ExhibitionComment } from "@/types/models";

export function subscribeComments(exhibitionId: string, cb: (comments: ExhibitionComment[]) => void) {
  const q = query(
    collection(db, "exhibitions", exhibitionId, "comments"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExhibitionComment)));
  });
}

export async function addComment(
  exhibitionId: string,
  authorUid: string,
  authorName: string,
  text: string
): Promise<void> {
  const commentRef = doc(collection(db, "exhibitions", exhibitionId, "comments"));
  const exhibitionRef = doc(db, "exhibitions", exhibitionId);

  await runTransaction(db, async (tx) => {
    tx.set(commentRef, {
      authorUid,
      authorName,
      text,
      createdAt: serverTimestamp(),
    });
    tx.update(exhibitionRef, { commentCount: increment(1) });
  });
}

export async function deleteComment(exhibitionId: string, commentId: string): Promise<void> {
  const commentRef = doc(db, "exhibitions", exhibitionId, "comments", commentId);
  const exhibitionRef = doc(db, "exhibitions", exhibitionId);

  await runTransaction(db, async (tx) => {
    tx.delete(commentRef);
    tx.update(exhibitionRef, { commentCount: increment(-1) });
  });
}
