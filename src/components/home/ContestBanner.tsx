"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useCountdownTimer } from "@/hooks/useCountdown";
import { getBannerTheme } from "@/lib/firestore/bannerThemes";
import { getSubmissionWindowState } from "@/lib/utils/dateWindow";
import type { BannerTheme, Category } from "@/types/models";
import { Button } from "@/components/ui/Button";

const THEME_POLL_INTERVAL_MS = 2000;
const THEME_POLL_MAX_ATTEMPTS = 60; // ~2 minutes of grace for clock skew

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-xl font-extrabold tabular-nums text-white sm:h-16 sm:w-16 sm:text-2xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[11px] font-medium text-white/70 sm:text-xs">{label}</span>
    </div>
  );
}

function CountdownRow({
  title,
  remaining,
}: {
  title: string;
  remaining: { days: number; hours: number; minutes: number; seconds: number };
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{title}</p>
      <div className="mt-3 flex justify-center gap-2 sm:gap-3">
        <TimeBlock value={remaining.days} label="일" />
        <TimeBlock value={remaining.hours} label="시간" />
        <TimeBlock value={remaining.minutes} label="분" />
        <TimeBlock value={remaining.seconds} label="초" />
      </div>
    </div>
  );
}

export function ContestBanner({ category }: { category: Category }) {
  const applyRemaining = useCountdownTimer(category.submissionOpenAt.toDate());
  const closeRemaining = useCountdownTimer(category.submissionCloseAt.toDate());
  const revealRemaining = useCountdownTimer(category.themeRevealAt?.toDate() ?? null);
  const popularAwardRemaining = useCountdownTimer(category.popularAwardCloseAt?.toDate() ?? null);
  const [theme, setTheme] = useState<BannerTheme | null>(null);

  useEffect(() => {
    if (!revealRemaining || !revealRemaining.done || theme) return;

    let attempts = 0;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      attempts++;
      const result = await getBannerTheme(category.id).catch(() => null);
      if (result) {
        if (!cancelled) setTheme(result);
        return;
      }
      if (attempts < THEME_POLL_MAX_ATTEMPTS && !cancelled) {
        setTimeout(poll, THEME_POLL_INTERVAL_MS);
      }
    }
    poll();

    return () => {
      cancelled = true;
    };
  }, [revealRemaining, theme, category.id]);

  const windowState = getSubmissionWindowState(category.submissionOpenAt, category.submissionCloseAt);
  const applyOpen = !applyRemaining || applyRemaining.done;
  const themeRevealed = revealRemaining !== null && revealRemaining.done && !!theme;

  return (
    <section
      className="relative flex items-center overflow-hidden rounded-3xl bg-gradient-to-br from-foreground via-foreground to-primary-dark bg-cover bg-center py-14 text-white sm:aspect-[8/3] sm:py-0"
      style={category.bannerImageUrl ? { backgroundImage: `url(${category.bannerImageUrl})` } : undefined}
    >
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] sm:flex-row sm:items-center sm:justify-around sm:gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{category.name}</p>
          <AnimatePresence mode="wait">
            {!applyOpen ? (
              <motion.div key="apply-countdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">신청 시작까지</h2>
                {applyRemaining && <CountdownRow title="신청 시작" remaining={applyRemaining} />}
              </motion.div>
            ) : windowState === "open" ? (
              <motion.div key="apply-open" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">지금 신청할 수 있어요</h2>
                {closeRemaining && !closeRemaining.done && (
                  <div className="mt-4">
                    <CountdownRow title="신청 마감까지" remaining={closeRemaining} />
                  </div>
                )}
                <Link href={`/exhibitions/new?categoryId=${category.id}`}>
                  <Button className="mt-4">신청하기</Button>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="apply-closed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">접수가 마감됐어요</h2>
                {popularAwardRemaining && !popularAwardRemaining.done && (
                  <div className="mt-4">
                    <CountdownRow title="인기상 집계기간" remaining={popularAwardRemaining} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {category.themeRevealAt && (
          <div>
            <AnimatePresence mode="wait">
              {!themeRevealed ? (
                <motion.div key="reveal-countdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">주제 공개까지</h2>
                  {revealRemaining && <CountdownRow title="주제 공개" remaining={revealRemaining} />}
                </motion.div>
              ) : (
                <motion.div key="reveal-done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
                  <p className="text-sm font-semibold uppercase tracking-widest text-primary">Theme Revealed</p>
                  <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{theme?.themeTitle}</h2>
                  {theme?.themeDescription && (
                    <p className="mx-auto mt-2 max-w-xs text-sm text-white/80">{theme.themeDescription}</p>
                  )}
                  {theme?.themeImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={theme.themeImageUrl}
                      alt={theme.themeTitle}
                      className="mx-auto mt-4 max-h-48 rounded-2xl object-cover shadow-2xl"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
