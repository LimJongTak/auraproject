import { useEffect, useRef, useState } from "react";
import type { LinkPreviewApiResponse } from "@/lib/linkPreview/types";

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function useLinkPreview(url: string, debounceMs = 500) {
  const [data, setData] = useState<LinkPreviewApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!url || !isLikelyUrl(url)) {
      setData(null);
      setLoading(false);
      return;
    }

    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const json: LinkPreviewApiResponse = await res.json();
        if (requestIdRef.current === myRequestId) setData(json);
      } catch {
        if (requestIdRef.current === myRequestId) setData({ ok: false, error: "미리보기를 불러오지 못했어요" });
      } finally {
        if (requestIdRef.current === myRequestId) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [url, debounceMs]);

  return { data, loading };
}
