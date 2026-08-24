"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const pillClass = "rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark";

export function HashtagBadges({
  hashtags,
  max,
  className,
  // Cards already sit inside an outer <Link> to the detail page, so nesting
  // another <a> per tag is invalid HTML — pass `nested` there to render a
  // non-anchor element that still navigates (via router.push) instead.
  interactive = true,
  nested = false,
}: {
  hashtags: string[];
  max?: number;
  className?: string;
  interactive?: boolean;
  nested?: boolean;
}) {
  const router = useRouter();
  if (!hashtags || hashtags.length === 0) return null;
  const shown = max ? hashtags.slice(0, max) : hashtags;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((tag) => {
        if (!interactive) {
          return (
            <span key={tag} className={pillClass}>
              #{tag}
            </span>
          );
        }

        const href = `/exhibitions?searchType=hashtag&q=${encodeURIComponent(tag)}`;

        if (nested) {
          return (
            <span
              key={tag}
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(href);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(href);
                }
              }}
              className={cn(pillClass, "cursor-pointer")}
            >
              #{tag}
            </span>
          );
        }

        return (
          <Link key={tag} href={href} onClick={(e) => e.stopPropagation()} className={pillClass}>
            #{tag}
          </Link>
        );
      })}
      {max && hashtags.length > max && (
        <span className="text-xs font-medium text-muted">+{hashtags.length - max}</span>
      )}
    </div>
  );
}
