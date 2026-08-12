const PREFIX = "aura_admin_seen_";

// First-ever check initializes the watermark to "now" so pre-existing data
// doesn't all show up as a wall of "new" issues on first use.
export function getLastSeen(key: string): number {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(PREFIX + key);
  if (raw) return Number(raw);
  const now = Date.now();
  window.localStorage.setItem(PREFIX + key, String(now));
  return now;
}

export function markSeen(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + key, String(Date.now()));
}
