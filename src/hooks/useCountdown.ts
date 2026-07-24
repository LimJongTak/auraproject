import { useEffect, useState } from "react";

export interface CountdownRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  done: boolean;
}

function computeRemaining(targetMs: number): CountdownRemaining {
  const totalMs = Math.max(0, targetMs - Date.now());
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs, done: totalMs <= 0 };
}

/** Ticks every second toward `target`. Pass `null` to disable (returns null). */
export function useCountdownTimer(target: Date | null): CountdownRemaining | null {
  const targetMs = target?.getTime() ?? null;
  const [remaining, setRemaining] = useState<CountdownRemaining | null>(
    targetMs === null ? null : computeRemaining(targetMs)
  );

  useEffect(() => {
    if (targetMs === null) {
      setRemaining(null);
      return;
    }
    setRemaining(computeRemaining(targetMs));
    const interval = setInterval(() => setRemaining(computeRemaining(targetMs)), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  return remaining;
}
