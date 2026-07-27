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
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Inquiry } from "@/types/models";

const inquiriesRef = () => collection(db, "inquiries");

export interface NewInquiryInput {
  uid: string;
  authorName: string;
  title: string;
  content: string;
}

export async function createInquiry(input: NewInquiryInput) {
  await addDoc(inquiriesRef(), {
    uid: input.uid,
    authorName: input.authorName,
    title: input.title,
    content: input.content,
    status: "pending",
    answer: null,
    answeredAt: null,
    answeredBy: null,
    createdAt: serverTimestamp(),
  });
}

export function subscribeMyInquiries(uid: string, cb: (inquiries: Inquiry[]) => void) {
  const q = query(inquiriesRef(), where("uid", "==", uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inquiry)));
  });
}

export async function listAllInquiriesForAdmin(): Promise<Inquiry[]> {
  const q = query(inquiriesRef(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inquiry));
}

export async function answerInquiry(id: string, answer: string, adminUid: string) {
  await updateDoc(doc(db, "inquiries", id), {
    status: "answered",
    answer,
    answeredAt: serverTimestamp(),
    answeredBy: adminUid,
  });
}

export async function deleteInquiry(id: string) {
  await deleteDoc(doc(db, "inquiries", id));
}
