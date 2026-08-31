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
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Category, ContestType, RubricItem } from "@/types/models";

const categoriesRef = () => collection(db, "categories");

export function subscribeCategories(cb: (categories: Category[]) => void) {
  const q = query(categoriesRef(), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
  });
}

export async function getCategory(id: string): Promise<Category | null> {
  const snap = await getDoc(doc(db, "categories", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Category) : null;
}

export interface CategoryInput {
  name: string;
  contestType: ContestType;
  description: string | null;
  detailContent: string | null;
  order: number;
  isActive: boolean;
  submissionOpenAt: Date;
  submissionCloseAt: Date;
  teamSizeMin: number;
  teamSizeMax: number | null;
  bannerImageUrl: string | null;
  thumbnailUrl: string | null;
  baseMileage: number;
  rubric: RubricItem[];
  popularAwardCount: number;
  popularAwardCloseAt: Date | null;
}

export async function createCategory(input: CategoryInput) {
  await addDoc(categoriesRef(), {
    name: input.name,
    contestType: input.contestType,
    description: input.description,
    detailContent: input.detailContent,
    order: input.order,
    isActive: input.isActive,
    submissionOpenAt: Timestamp.fromDate(input.submissionOpenAt),
    submissionCloseAt: Timestamp.fromDate(input.submissionCloseAt),
    teamSizeMin: input.teamSizeMin,
    teamSizeMax: input.teamSizeMax,
    bannerImageUrl: input.bannerImageUrl,
    thumbnailUrl: input.thumbnailUrl,
    baseMileage: input.baseMileage,
    rubric: input.rubric,
    popularAwardCount: input.popularAwardCount,
    popularAwardCloseAt: input.popularAwardCloseAt ? Timestamp.fromDate(input.popularAwardCloseAt) : null,
    popularAwardAssignedAt: null,
    themeRevealAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  await updateDoc(doc(db, "categories", id), {
    name: input.name,
    contestType: input.contestType,
    description: input.description,
    detailContent: input.detailContent,
    order: input.order,
    isActive: input.isActive,
    submissionOpenAt: Timestamp.fromDate(input.submissionOpenAt),
    submissionCloseAt: Timestamp.fromDate(input.submissionCloseAt),
    teamSizeMin: input.teamSizeMin,
    teamSizeMax: input.teamSizeMax,
    bannerImageUrl: input.bannerImageUrl,
    thumbnailUrl: input.thumbnailUrl,
    baseMileage: input.baseMileage,
    rubric: input.rubric,
    popularAwardCount: input.popularAwardCount,
    popularAwardCloseAt: input.popularAwardCloseAt ? Timestamp.fromDate(input.popularAwardCloseAt) : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}

export async function updateCategoryBannerImage(id: string, bannerImageUrl: string | null) {
  await updateDoc(doc(db, "categories", id), {
    bannerImageUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategoryThemeReveal(id: string, revealAt: Date | null) {
  await updateDoc(doc(db, "categories", id), {
    themeRevealAt: revealAt ? Timestamp.fromDate(revealAt) : null,
    updatedAt: serverTimestamp(),
  });
}
