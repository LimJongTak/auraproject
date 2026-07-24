"use client";

import { useEffect, useState } from "react";
import { subscribeCategories } from "@/lib/firestore/categories";
import type { Category } from "@/types/models";
import { ContestBanner } from "./ContestBanner";

export function ContestBanners() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  const banners = (categories ?? []).filter((c) => c.isActive && c.bannerImageUrl);
  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex flex-col gap-6">
        {banners.map((c) => (
          <ContestBanner key={c.id} category={c} />
        ))}
      </div>
    </section>
  );
}
