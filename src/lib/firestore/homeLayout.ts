import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { HOME_SECTION_KEYS, type HomeSectionKey } from "@/types/models";

// Singleton doc — one home page, one layout.
const homeLayoutRef = () => doc(db, "siteSettings", "homeLayout");

// Tolerates a missing doc (brand-new site), a stale list from before a
// section key was added/removed, or garbage — always returns every known
// key exactly once. Unknown saved sections keep their relative order;
// anything new lands at the end.
function sanitizeOrder(raw: unknown): HomeSectionKey[] {
  const known = new Set<string>(HOME_SECTION_KEYS);
  const kept = Array.isArray(raw) ? raw.filter((k): k is HomeSectionKey => known.has(k)) : [];
  const missing = HOME_SECTION_KEYS.filter((k) => !kept.includes(k));
  return [...kept, ...missing];
}

export function subscribeHomeLayout(cb: (order: HomeSectionKey[]) => void) {
  return onSnapshot(
    homeLayoutRef(),
    (snap) => cb(sanitizeOrder(snap.data()?.sectionOrder)),
    () => cb([...HOME_SECTION_KEYS])
  );
}

export async function getHomeLayout(): Promise<HomeSectionKey[]> {
  const snap = await getDoc(homeLayoutRef());
  return sanitizeOrder(snap.data()?.sectionOrder);
}

export async function setHomeLayout(order: HomeSectionKey[]): Promise<void> {
  await setDoc(homeLayoutRef(), { sectionOrder: order, updatedAt: serverTimestamp() });
}
