import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { BannerTheme } from "@/types/models";

const bannerThemeRef = (categoryId: string) => doc(db, "bannerThemes", categoryId);

/** Admin-only live view (theme content is read-gated by Category.themeRevealAt for everyone else). */
export function subscribeBannerTheme(categoryId: string, cb: (theme: BannerTheme | null) => void) {
  return onSnapshot(
    bannerThemeRef(categoryId),
    (snap) => cb(snap.exists() ? (snap.data() as BannerTheme) : null),
    () => cb(null)
  );
}

/** One-shot fetch for public visitors, meant to be called after themeRevealAt has passed. */
export async function getBannerTheme(categoryId: string): Promise<BannerTheme | null> {
  const snap = await getDoc(bannerThemeRef(categoryId));
  return snap.exists() ? (snap.data() as BannerTheme) : null;
}

export async function setBannerTheme(
  categoryId: string,
  input: { themeTitle: string; themeDescription: string; themeImageUrl: string | null },
  uid: string
) {
  await setDoc(bannerThemeRef(categoryId), {
    themeTitle: input.themeTitle,
    themeDescription: input.themeDescription,
    themeImageUrl: input.themeImageUrl,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function deleteBannerTheme(categoryId: string) {
  await deleteDoc(bannerThemeRef(categoryId));
}
