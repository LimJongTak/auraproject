import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { UserProfile, UserRole } from "@/types/models";

export async function listAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export interface ProfileUpdateInput {
  memberType: UserProfile["memberType"];
  school: string;
  department: string;
  grade: string;
  studentId: string;
}

export async function updateMyProfile(uid: string, input: ProfileUpdateInput): Promise<void> {
  await updateDoc(doc(db, "users", uid), { ...input });
}
