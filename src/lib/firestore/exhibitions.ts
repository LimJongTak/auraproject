import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Exhibition, ExhibitionStatus, LinkPreviewData, SortOption } from "@/types/models";

const exhibitionsRef = () => collection(db, "exhibitions");

export interface NewExhibitionInput {
  teamId: string;
  teamName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  oneLiner: string;
  projectUrl: string | null;
  linkPreview: LinkPreviewData | null;
  submittedByUid: string;
}

export async function createDraftExhibition(input: NewExhibitionInput): Promise<string> {
  const ref = await addDoc(exhibitionsRef(), {
    teamId: input.teamId,
    teamName: input.teamName,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    title: input.title,
    oneLiner: input.oneLiner,
    year: new Date().getFullYear(),
    projectUrl: input.projectUrl,
    linkPreview: input.linkPreview,
    thumbnailUrl: null,
    pageImageUrls: [],
    pageCount: 0,
    likeCount: 0,
    commentCount: 0,
    status: "draft" as ExhibitionStatus,
    submittedByUid: input.submittedByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function publishExhibitionPages(
  id: string,
  data: { pageImageUrls: string[]; pageCount: number; thumbnailUrl: string | null }
) {
  await updateDoc(doc(db, "exhibitions", id), {
    pageImageUrls: data.pageImageUrls,
    pageCount: data.pageCount,
    thumbnailUrl: data.thumbnailUrl,
    status: "published" as ExhibitionStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function updateExhibitionMeta(
  id: string,
  data: {
    title: string;
    oneLiner: string;
    categoryId: string;
    categoryName: string;
    projectUrl: string | null;
    linkPreview: LinkPreviewData | null;
  }
) {
  await updateDoc(doc(db, "exhibitions", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function setExhibitionStatus(id: string, status: ExhibitionStatus) {
  await updateDoc(doc(db, "exhibitions", id), { status });
}

export async function deleteExhibition(id: string): Promise<void> {
  await deleteDoc(doc(db, "exhibitions", id));
}

export async function getExhibition(id: string): Promise<Exhibition | null> {
  const snap = await getDoc(doc(db, "exhibitions", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Exhibition) : null;
}

export interface ListExhibitionsOptions {
  categoryId?: string | null;
  sort?: SortOption;
  max?: number;
}

export async function listPublishedExhibitions(
  opts: ListExhibitionsOptions = {}
): Promise<Exhibition[]> {
  const { categoryId, sort = "latest", max = 60 } = opts;
  const clauses = [where("status", "==", "published")];
  if (categoryId) clauses.push(where("categoryId", "==", categoryId));
  const sortField = sort === "popular" ? "likeCount" : "createdAt";
  const q = query(exhibitionsRef(), ...clauses, orderBy(sortField, "desc"), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exhibition));
}

export async function listTeamExhibitions(teamId: string): Promise<Exhibition[]> {
  const q = query(exhibitionsRef(), where("teamId", "==", teamId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exhibition));
}

export async function listAllExhibitionsForAdmin(): Promise<Exhibition[]> {
  const q = query(exhibitionsRef(), orderBy("createdAt", "desc"), fbLimit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exhibition));
}

export function withinSubmissionWindow(openAt: Timestamp, closeAt: Timestamp): boolean {
  const now = Date.now();
  return now >= openAt.toMillis() && now <= closeAt.toMillis();
}
