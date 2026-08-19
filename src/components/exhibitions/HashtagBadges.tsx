import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const pillClass =
  "rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-primary-light hover:text-primary-dark";

export function HashtagBadges({
  hashtags,
  max,
  className,
  // Cards already sit inside an outer <Link> to the detail page, so nesting
  // another <a> per tag is invalid HTML — pass `interactive={false}` there
  // and render plain (non-clickable) pills instead.
  interactive = true,
}: {
  hashtags: string[];
  max?: number;
  className?: string;
  interactive?: boolean;
}) {
  if (!hashtags || hashtags.length === 0) return null;
  const shown = max ? hashtags.slice(0, max) : hashtags;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((tag) =>
        interactive ? (
          <Link
            key={tag}
            href={`/exhibitions?searchType=hashtag&q=${encodeURIComponent(tag)}`}
            onClick={(e) => e.stopPropagation()}
            className={pillClass}
          >
            #{tag}
          </Link>
        ) : (
          <span key={tag} className={pillClass}>
            #{tag}
          </span>
        )
      )}
      {max && hashtags.length > max && (
        <span className="text-xs font-medium text-muted">+{hashtags.length - max}</span>
      )}
    </div>
  );
}
