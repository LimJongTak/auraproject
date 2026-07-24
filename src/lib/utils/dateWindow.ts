import type { Timestamp } from "firebase/firestore";

export type SubmissionWindowState = "before" | "open" | "closed";

export function getSubmissionWindowState(
  openAt: Timestamp,
  closeAt: Timestamp,
  now: Date = new Date()
): SubmissionWindowState {
  const nowMs = now.getTime();
  if (nowMs < openAt.toMillis()) return "before";
  if (nowMs > closeAt.toMillis()) return "closed";
  return "open";
}

export function formatDateRange(openAt: Timestamp, closeAt: Timestamp): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return `${fmt(openAt.toDate())} ~ ${fmt(closeAt.toDate())}`;
}
