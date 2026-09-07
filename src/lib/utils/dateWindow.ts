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

// Formats a Date for a <input type="datetime-local"> value, in local time
// (not UTC, unlike Date#toISOString) — used wherever an admin sets a public
// reveal/countdown target (theme reveal, award announcement, ...).
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateRange(openAt: Timestamp, closeAt: Timestamp): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return `${fmt(openAt.toDate())} ~ ${fmt(closeAt.toDate())}`;
}
