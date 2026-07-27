export function insertAtCursor(el: HTMLTextAreaElement | null, current: string, snippet: string): string {
  if (!el) return current + snippet;
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  return current.slice(0, start) + snippet + current.slice(end);
}
