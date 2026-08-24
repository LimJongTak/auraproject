import Link from "next/link";
import Image from "next/image";
import { Trophy } from "lucide-react";
import type { Exhibition } from "@/types/models";
import { HashtagBadges } from "@/components/exhibitions/HashtagBadges";

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <Link href={`/exhibitions/${exhibition.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface transition group-hover:shadow-lg">
        {exhibition.award && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
            <Trophy size={12} /> {exhibition.award.label}
          </span>
        )}
        {exhibition.thumbnailUrl ? (
          <Image
            src={exhibition.thumbnailUrl}
            alt={exhibition.title}
            fill
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 90vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">이미지 없음</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="line-clamp-1 text-xs font-semibold text-muted">{exhibition.categoryName}</p>
        <p className="line-clamp-1 font-bold text-foreground transition group-hover:text-primary">{exhibition.title}</p>
        <p className="line-clamp-2 text-sm text-muted">{exhibition.oneLiner}</p>
        {exhibition.hashtags && exhibition.hashtags.length > 0 && (
          <HashtagBadges hashtags={exhibition.hashtags} max={3} nested className="mt-auto pt-1" />
        )}
      </div>
    </Link>
  );
}

export function ExhibitionCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3">
      <div className="aspect-[4/3] w-full rounded-2xl bg-surface" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
        <div className="h-3 w-full rounded bg-surface" />
      </div>
    </div>
  );
}
