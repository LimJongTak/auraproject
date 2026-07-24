"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeMyLike, toggleLike } from "@/lib/firestore/likes";
import { cn } from "@/lib/utils/cn";

export function LikeButton({ exhibitionId, likeCount }: { exhibitionId: string; likeCount: number }) {
  const { firebaseUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  useEffect(() => setOptimisticCount(likeCount), [likeCount]);

  useEffect(() => {
    if (!firebaseUser) {
      setLiked(false);
      return;
    }
    const unsub = subscribeMyLike(exhibitionId, firebaseUser.uid, setLiked);
    return () => unsub();
  }, [exhibitionId, firebaseUser]);

  async function handleClick() {
    if (!firebaseUser) {
      window.location.href = "/login";
      return;
    }
    if (busy) return;
    setBusy(true);
    setOptimisticCount((c) => c + (liked ? -1 : 1));
    try {
      await toggleLike(exhibitionId, firebaseUser.uid);
    } catch {
      setOptimisticCount((c) => c + (liked ? 1 : -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        liked
          ? "border-primary bg-primary-light text-primary-dark"
          : "border-border bg-white text-foreground hover:border-primary hover:text-primary"
      )}
    >
      <Heart size={16} className={liked ? "fill-primary text-primary" : ""} />
      {optimisticCount}명이 관심있어요
    </button>
  );
}
