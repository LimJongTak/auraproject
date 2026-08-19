"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 15;

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").slice(0, MAX_TAG_LENGTH);
}

export interface HashtagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function HashtagInput({ value, onChange, label, hint, className }: HashtagInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const tag = normalizeTag(draft);
    setDraft("");
    if (!tag) return;
    if (value.length >= MAX_TAGS) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-primary-dark/60 hover:text-primary-dark"
              aria-label={`${tag} 태그 삭제`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder={value.length === 0 ? "태그 입력 후 Enter (예: 바이브코딩)" : "추가"}
            className="min-w-24 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
        )}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
