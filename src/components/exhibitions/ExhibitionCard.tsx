import Link from "next/link";
import { Heart, Trophy } from "lucide-react";
import type { Exhibition } from "@/types/models";
import { Badge } from "@/components/ui/misc";

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <Link
      href={`/exhibitions/${exhibition.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {exhibition.award && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
            <Trophy size={12} /> {exhibition.award.label}
          </span>
        )}
        {exhibition.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exhibition.thumbnailUrl}
            alt={exhibition.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">이미지 없음</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <Badge>{exhibition.categoryName}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Heart size={12} /> {exhibition.likeCount}
          </span>
        </div>
        <p className="font-bold text-foreground">{exhibition.teamName}</p>
        <p className="line-clamp-2 text-sm text-muted">{exhibition.oneLiner}</p>
      </div>
    </Link>
  );
}

export function ExhibitionCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div className="aspect-[4/3] w-full bg-surface" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-16 rounded-full bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
        <div className="h-3 w-full rounded bg-surface" />
      </div>
    </div>
  );
}
