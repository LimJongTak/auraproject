import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Flame, Crown, Heart } from "lucide-react";
import type { Exhibition } from "@/types/models";
import { cn } from "@/lib/utils/cn";

const RANK_STYLES = [
  {
    badge: "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950",
    card: "ring-2 ring-amber-400",
    label: "1위",
  },
  {
    badge: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
    card: "ring-1 ring-border",
    label: "2위",
  },
  {
    badge: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950",
    card: "ring-1 ring-border",
    label: "3위",
  },
];

function PopularCard({ exhibition, rank }: { exhibition: Exhibition; rank: number }) {
  const style = RANK_STYLES[rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: rank * 0.12, ease: "easeOut" }}
    >
      <Link
        href={`/exhibitions/${exhibition.id}`}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl bg-white transition hover:-translate-y-1 hover:shadow-xl",
          style.card
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
          <span
            className={cn(
              "absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold shadow-lg",
              style.badge
            )}
          >
            {rank === 0 ? <Crown size={18} /> : style.label}
          </span>
          {exhibition.thumbnailUrl ? (
            <Image
              src={exhibition.thumbnailUrl}
              alt={exhibition.title}
              fill
              sizes="(min-width: 640px) 33vw, 90vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted">이미지 없음</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="line-clamp-1 text-xs font-semibold text-muted">{exhibition.categoryName}</p>
          <p className="line-clamp-1 font-bold text-foreground transition group-hover:text-primary">
            {exhibition.title}
          </p>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted">
            <Heart size={14} className="fill-primary text-primary" />
            <span className="font-semibold text-foreground">{exhibition.likeCount}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PopularExhibitions({ exhibitions }: { exhibitions: Exhibition[] }) {
  if (exhibitions.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 pt-14">
      <div className="flex items-center gap-2">
        <Flame size={20} className="text-primary" />
        <h2 className="text-xl font-extrabold">지금 인기 있는 전시물</h2>
      </div>
      <p className="mt-1 text-sm text-muted">좋아요를 가장 많이 받은 전시물 TOP 3</p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {exhibitions.map((exhibition, i) => (
          <PopularCard key={exhibition.id} exhibition={exhibition} rank={i} />
        ))}
      </div>
    </section>
  );
}
