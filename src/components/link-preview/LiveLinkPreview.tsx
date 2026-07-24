"use client";

import { useLinkPreview } from "@/hooks/useLinkPreview";
import { LinkPreviewCard, LinkPreviewFallback, LinkPreviewSkeleton } from "./LinkPreviewCard";

export function LiveLinkPreview({ url }: { url: string }) {
  const { data, loading } = useLinkPreview(url);

  if (!url) return null;
  if (loading && !data) return <LinkPreviewSkeleton />;
  if (!data || !data.ok) return <LinkPreviewFallback url={url} />;

  return (
    <LinkPreviewCard
      url={data.url ?? url}
      title={data.title}
      description={data.description}
      image={data.image}
      favicon={data.favicon}
      domain={data.domain}
    />
  );
}
