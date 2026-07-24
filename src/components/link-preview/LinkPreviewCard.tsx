import { ExternalLink, Globe } from "lucide-react";

export interface LinkPreviewCardProps {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  domain?: string | null;
}

export function LinkPreviewCard({ url, title, description, image, favicon, domain }: LinkPreviewCardProps) {
  const displayDomain = domain ?? safeHostname(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:flex-row"
    >
      <div className="relative aspect-video w-full shrink-0 bg-surface sm:aspect-square sm:w-56">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <Globe size={32} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5 p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="h-3.5 w-3.5 rounded-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <Globe size={12} />
          )}
          <span>{displayDomain}</span>
        </div>
        <p className="line-clamp-1 font-semibold text-foreground">{title || url}</p>
        {description && <p className="line-clamp-2 text-sm text-muted">{description}</p>}
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
          사이트로 이동 <ExternalLink size={12} />
        </span>
      </div>
    </a>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function LinkPreviewSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-border bg-white sm:flex-row">
      <div className="aspect-video w-full shrink-0 bg-surface sm:aspect-square sm:w-56" />
      <div className="flex flex-1 flex-col justify-center gap-2 p-5">
        <div className="h-3 w-24 rounded bg-surface" />
        <div className="h-4 w-3/4 rounded bg-surface" />
        <div className="h-3 w-full rounded bg-surface" />
      </div>
    </div>
  );
}

export function LinkPreviewFallback({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted hover:border-primary hover:text-primary"
    >
      <Globe size={18} />
      <span className="truncate">{url}</span>
      <ExternalLink size={14} className="ml-auto shrink-0" />
    </a>
  );
}
