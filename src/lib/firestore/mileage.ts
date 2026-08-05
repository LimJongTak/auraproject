import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { MileageGrant, MileageSource } from "@/types/models";

const mileageRef = () => collection(db, "mileageGrants");

export interface MileageGrantInput {
  uid: string;
  studentName: string;
  studentIdNumber: string;
  amount: number;
  title: string;
  content: string;
  semester: string;
  source: MileageSource;
  categoryId: string | null;
  categoryName: string | null;
  grantedBy: string;
  grantedByName: string;
}

export async function createMileageGrant(input: MileageGrantInput): Promise<void> {
  await addDoc(mileageRef(), { ...input, createdAt: serverTimestamp() });
}

export async function deleteMileageGrant(id: string): Promise<void> {
  await deleteDoc(doc(db, "mileageGrants", id));
}

export function subscribeMyMileageGrants(uid: string, cb: (grants: MileageGrant[]) => void) {
  const q = query(mileageRef(), where("uid", "==", uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MileageGrant)));
  });
}

export async function listMileageGrantsForUser(uid: string): Promise<MileageGrant[]> {
  const q = query(mileageRef(), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MileageGrant));
}

export async function listAllMileageGrants(): Promise<MileageGrant[]> {
  const q = query(mileageRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MileageGrant));
}
