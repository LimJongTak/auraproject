import { BookOpen, ExternalLink, Globe } from "lucide-react";
import { AppStoreIcon, GooglePlayIcon, IconBadge, InstagramIcon, YoutubeIcon } from "@/lib/constants/referenceLinkIcons";
import type { ReferenceLinks } from "@/types/models";

const ITEMS: { key: keyof ReferenceLinks; label: string; subtitle: string; badge: React.ReactNode; badgeType: string }[] = [
  { key: "homepage", label: "홈페이지", subtitle: "공식 홈페이지 방문", badge: <Globe size={18} />, badgeType: "homepage" },
  { key: "instagram", label: "인스타그램", subtitle: "인스타그램에서 보기", badge: <InstagramIcon size={18} />, badgeType: "instagram" },
  { key: "youtube", label: "유튜브", subtitle: "유튜브에서 보기", badge: <YoutubeIcon size={18} />, badgeType: "youtube" },
  { key: "appStore", label: "App Store", subtitle: "App Store에서 다운로드", badge: <AppStoreIcon size={18} />, badgeType: "appStore" },
  { key: "googlePlay", label: "Google Play", subtitle: "Google Play에서 다운로드", badge: <GooglePlayIcon size={18} />, badgeType: "googlePlay" },
];

export function ReferenceLinksRow({ links }: { links: ReferenceLinks | null | undefined }) {
  if (!links) return null;
  const active = ITEMS.filter((item) => links[item.key]);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <BookOpen size={16} className="text-muted" />
        참고 페이지
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {active.map((item) => (
          <a
            key={item.key}
            href={links[item.key]!}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-border bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <IconBadge type={item.badgeType as never}>{item.badge}</IconBadge>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-bold text-foreground">{item.label}</span>
                <ExternalLink size={11} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
              </div>
              <p className="truncate text-xs text-muted">{item.subtitle}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
