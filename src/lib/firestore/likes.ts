import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export function subscribeMyLike(exhibitionId: string, uid: string, cb: (liked: boolean) => void) {
  return onSnapshot(doc(db, "exhibitions", exhibitionId, "likes", uid), (snap) => {
    cb(snap.exists());
  });
}

export async function toggleLike(exhibitionId: string, uid: string): Promise<void> {
  const likeRef = doc(db, "exhibitions", exhibitionId, "likes", uid);
  const exhibitionRef = doc(db, "exhibitions", exhibitionId);

  await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(exhibitionRef, { likeCount: increment(-1) });
    } else {
      tx.set(likeRef, { createdAt: serverTimestamp() });
      tx.update(exhibitionRef, { likeCount: increment(1) });
    }
  });
}
