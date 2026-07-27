import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Announcement } from "@/types/models";

const announcementsRef = () => collection(db, "announcements");

export function subscribeAnnouncements(cb: (announcements: Announcement[]) => void) {
  const q = query(announcementsRef(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
  });
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const snap = await getDoc(doc(db, "announcements", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Announcement) : null;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  imageUrl: string | null;
}

export async function createAnnouncement(input: AnnouncementInput, uid: string) {
  await addDoc(announcementsRef(), {
    title: input.title,
    content: input.content,
    imageUrl: input.imageUrl,
    authorUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAnnouncement(id: string, input: AnnouncementInput) {
  await updateDoc(doc(db, "announcements", id), {
    title: input.title,
    content: input.content,
    imageUrl: input.imageUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, "announcements", id));
}
