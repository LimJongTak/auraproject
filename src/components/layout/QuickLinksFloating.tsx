"use client";

import { useEffect, useState } from "react";
import { subscribeQuickLinks } from "@/lib/firestore/quickLinks";
import { DEFAULT_QUICK_LINK_ICON, QUICK_LINK_ICONS } from "@/lib/constants/quickLinkIcons";
import type { QuickLink } from "@/types/models";
import { AuraMileageInfoModal } from "@/components/quicklinks/AuraMileageInfoModal";

// Desktop-only floating quick-link menu on the right edge of the viewport,
// modeled after the "대출현황/찜목록/이용안내" side menu pattern. Hidden below
// the lg breakpoint since it would overlap page content on narrow screens.
export function QuickLinksFloating() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [infoModalLink, setInfoModalLink] = useState<QuickLink | null>(null);

  useEffect(() => {
    const unsub = subscribeQuickLinks(setLinks);
    return () => unsub();
  }, []);

  const active = links.filter((l) => l.isActive);
  if (active.length === 0) return null;

  return (
    <>
      <div className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border bg-white shadow-lg lg:flex">
        {active.map((link) => {
          const { Icon } = QUICK_LINK_ICONS[link.icon] ?? QUICK_LINK_ICONS[DEFAULT_QUICK_LINK_ICON];
          const itemClassName =
            "flex w-20 flex-col items-center gap-1.5 border-b border-border px-2 py-4 text-center text-foreground transition last:border-b-0 hover:bg-primary-light hover:text-primary-dark";
          if (link.contentKey) {
            return (
              <button key={link.id} onClick={() => setInfoModalLink(link)} className={itemClassName}>
                <Icon size={22} />
                <span className="text-[11px] font-semibold leading-tight">{link.label}</span>
              </button>
            );
          }
          return (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={itemClassName}>
              <Icon size={22} />
              <span className="text-[11px] font-semibold leading-tight">{link.label}</span>
            </a>
          );
        })}
      </div>

      {infoModalLink?.contentKey === "aura-mileage" && (
        <AuraMileageInfoModal url={infoModalLink.url} onClose={() => setInfoModalLink(null)} />
      )}
    </>
  );
}
