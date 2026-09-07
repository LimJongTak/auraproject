import type { Category, Exhibition } from "@/types/models";

// True once a category's award-announcement time has passed, or if staged
// reveal was never turned on for it (awardAnnounceAt null — awards show
// immediately, matching pre-feature behavior). Missing category data (not
// loaded yet) fails closed, same as "not announced".
export function isAwardAnnounced(category: Pick<Category, "awardAnnounceAt"> | null | undefined): boolean {
  if (category === null || category === undefined) return false;
  if (!category.awardAnnounceAt) return true;
  return Date.now() >= category.awardAnnounceAt.toMillis();
}

// Strips `award` from any exhibition whose contest hasn't hit its
// announcement time yet, so pre-reveal renders never end up with the label
// in props. UI-level only — see Category.awardAnnounceAt for the caveat.
export function redactUnannouncedAwards<T extends Pick<Exhibition, "categoryId" | "award">>(
  exhibitions: T[],
  categoriesById: Map<string, Category>
): T[] {
  return exhibitions.map((ex) =>
    ex.award && !isAwardAnnounced(categoriesById.get(ex.categoryId)) ? { ...ex, award: null } : ex
  );
}
