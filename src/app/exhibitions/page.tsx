"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeCategories } from "@/lib/firestore/categories";
import type { Category, Exhibition, SortOption } from "@/types/models";
import { ExhibitionCard, ExhibitionCardSkeleton } from "@/components/exhibitions/ExhibitionCard";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function ExhibitionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [search, setSearch] = useState("");
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    listPublishedExhibitions({ categoryId: categoryId || null, sort })
      .then(setExhibitions)
      .finally(() => setLoading(false));
  }, [categoryId, sort]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return exhibitions;
    return exhibitions.filter(
      (e) => e.title.toLowerCase().includes(term) || e.oneLiner.toLowerCase().includes(term)
    );
  }, [exhibitions, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "온라인전시관" }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">온라인전시관</h1>
          <p className="mt-1 text-sm text-muted">{exhibitions.length}개의 프로젝트와 함께합니다.</p>
        </div>
        <Link href="/exhibitions/new">
          <Button>
            <Plus size={16} /> 전시물 등록
          </Button>
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-auto min-w-[10rem]"
        >
          <option value="">전체</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <div className="flex rounded-full bg-surface p-1 text-sm">
          {(["latest", "popular"] as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={cn(
                "rounded-full px-4 py-1.5 font-semibold transition",
                sort === opt ? "bg-white text-primary shadow-sm" : "text-muted"
              )}
            >
              {opt === "latest" ? "최신순" : "인기순"}
            </button>
          ))}
        </div>

        <div className="relative ml-auto w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 소개로 검색"
            className="w-full rounded-full border border-border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ExhibitionCardSkeleton key={i} />)
          : filtered.map((exhibition) => <ExhibitionCard key={exhibition.id} exhibition={exhibition} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState title="등록된 전시물이 없어요" description="가장 먼저 프로젝트를 등록해보세요." />
      )}
    </div>
  );
}
