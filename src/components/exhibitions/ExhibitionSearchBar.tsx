"use client";

import { Search } from "lucide-react";
import type { ExhibitionSearchType } from "@/types/models";

const SEARCH_TYPE_LABELS: Record<ExhibitionSearchType, string> = {
  team: "팀명",
  all: "제목 + 내용",
  title: "제목",
  content: "내용",
  hashtag: "해시태그",
};

const SEARCH_TYPES: ExhibitionSearchType[] = ["team", "all", "title", "content", "hashtag"];

const PLACEHOLDERS: Record<ExhibitionSearchType, string> = {
  team: "팀명으로 검색",
  all: "제목, 내용으로 검색",
  title: "제목으로 검색",
  content: "내용으로 검색",
  hashtag: "해시태그로 검색 (# 없이 입력)",
};

const boxClass =
  "rounded-xl border border-border bg-white text-sm outline-none transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15";

export function ExhibitionSearchBar({
  searchType,
  onSearchTypeChange,
  value,
  onChange,
  className,
}: {
  searchType: ExhibitionSearchType;
  onSearchTypeChange: (type: ExhibitionSearchType) => void;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-stretch gap-2 ${className ?? ""}`}>
      <select
        value={searchType}
        onChange={(e) => onSearchTypeChange(e.target.value as ExhibitionSearchType)}
        className={`${boxClass} shrink-0 px-3.5 py-2 font-semibold text-foreground/80`}
      >
        {SEARCH_TYPES.map((t) => (
          <option key={t} value={t}>
            {SEARCH_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <div className={`${boxClass} flex flex-1 items-center pr-1.5`}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDERS[searchType]}
          className="w-full min-w-0 flex-1 bg-transparent py-2 pl-4 pr-2 outline-none placeholder:text-muted/70"
        />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted">
          <Search size={16} />
        </span>
      </div>
    </div>
  );
}
