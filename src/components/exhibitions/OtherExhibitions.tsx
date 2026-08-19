"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import type { Exhibition } from "@/types/models";
import { Button } from "@/components/ui/Button";

export function OtherExhibitions({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<Exhibition[] | null>(null);

  useEffect(() => {
    listPublishedExhibitions({ sort: "latest", max: 9 }).then((list) =>
      setItems(list.filter((e) => e.id !== currentId).slice(0, 8))
    );
  }, [currentId]);

  if (items !== null && items.length === 0) return null;

  return (
    <div className="mt-14">
      <h2 className="text-lg font-bold">다른 아이템 살펴보기</h2>

      <div className="mt-4 -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
        {items === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-48 shrink-0 animate-pulse">
                <div className="aspect-[4/3] w-full rounded-2xl bg-surface" />
                <div className="mt-2 h-4 w-3/4 rounded bg-surface" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-surface" />
              </div>
            ))
          : items.map((item) => (
              <Link key={item.id} href={`/exhibitions/${item.id}`} className="group w-48 shrink-0">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface transition group-hover:shadow-lg">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      sizes="192px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">이미지 없음</div>
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-bold text-foreground transition group-hover:text-primary">
                  {item.title}
                </p>
                <p className="line-clamp-1 text-xs text-muted">{item.teamName}</p>
              </Link>
            ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/exhibitions">
          <Button size="lg">목록가기</Button>
        </Link>
      </div>
    </div>
  );
}
