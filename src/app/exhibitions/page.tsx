"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { subscribeCategories } from "@/lib/firestore/categories";
import type { Category, Exhibition, ExhibitionSearchType, SortOption } from "@/types/models";
import { ExhibitionCard, ExhibitionCardSkeleton } from "@/components/exhibitions/ExhibitionCard";
import { ExhibitionSearchBar } from "@/components/exhibitions/ExhibitionSearchBar";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

function matchesSearch(exhibition: Exhibition, searchType: ExhibitionSearchType, term: string): boolean {
  if (!term) return true;
  switch (searchType) {
    case "team":
      return exhibition.teamName.toLowerCase().includes(term);
    case "title":
      return exhibition.title.toLowerCase().includes(term);
    case "content":
      return exhibition.oneLiner.toLowerCase().includes(term);
    case "hashtag":
      return (exhibition.hashtags ?? []).some((tag) => tag.toLowerCase().includes(term.replace(/^#+/, "")));
    case "all":
    default:
      return exhibition.title.toLowerCase().includes(term) || exhibition.oneLiner.toLowerCase().includes(term);
  }
}

export default function ExhibitionsPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <ExhibitionsPageInner />
    </Suspense>
  );
}

function ExhibitionsPageInner() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [searchType, setSearchType] = useState<ExhibitionSearchType>(
    (searchParams.get("searchType") as ExhibitionSearchType) || "all"
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  // Hashtag pills link here with a query string while this page may already
  // be mounted (e.g. clicking a tag on a card in this same list), so re-sync
  // the search state whenever the URL params change instead of only on mount.
  useEffect(() => {
    setSearchType((searchParams.get("searchType") as ExhibitionSearchType) || "all");
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    listPublishedExhibitions({ categoryId: categoryId || null, sort })
      .then(setExhibitions)
      .finally(() => setLoading(false));
  }, [categoryId, sort]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exhibitions.filter((e) => matchesSearch(e, searchType, term));
  }, [exhibitions, search, searchType]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "온라인전시관" }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">온라인전시관</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-primary">{exhibitions.length}개</span>의 프로젝트와 함께합니다.
          </p>
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

        <ExhibitionSearchBar
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          value={search}
          onChange={setSearch}
          className="ml-auto w-full max-w-sm"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
