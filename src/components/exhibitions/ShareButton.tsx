"use client";

import { useState } from "react";
import { Mail, MessageCircle, Share2, X as CloseIcon, Link as LinkIcon } from "lucide-react";
import { FacebookIcon, IconBadge, InstagramIcon, ThreadsIcon, XIcon } from "@/lib/constants/referenceLinkIcons";
import { cn } from "@/lib/utils/cn";

interface ShareOption {
  key: string;
  label: string;
  badgeType: string;
  icon: React.ReactNode;
  action: (ctx: { url: string; title: string }) => void;
}

async function copyLink(url: string, onCopied: () => void) {
  try {
    await navigator.clipboard.writeText(url);
    onCopied();
  } catch {
    // clipboard unavailable — nothing more we can do silently
  }
}

export function ShareButton({ title, text, className }: { title: string; text?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  function getUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  const shareText = text ? `${title} - ${text}` : title;

  const options: ShareOption[] = [
    {
      key: "x",
      label: "X",
      badgeType: "x",
      icon: <XIcon size={18} />,
      action: ({ url }) =>
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer"),
    },
    {
      key: "threads",
      label: "Threads",
      badgeType: "threads",
      icon: <ThreadsIcon size={18} />,
      action: ({ url }) =>
        window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(`${shareText} ${url}`)}`, "_blank", "noopener,noreferrer"),
    },
    {
      key: "facebook",
      label: "페이스북",
      badgeType: "facebook",
      icon: <FacebookIcon size={18} />,
      action: ({ url }) =>
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer"),
    },
    {
      key: "instagram",
      label: "인스타그램",
      badgeType: "instagram",
      icon: <InstagramIcon size={18} />,
      action: ({ url }) => copyLink(url, () => showToast("링크가 복사됐어요. 인스타그램에 붙여넣어 공유해보세요.")),
    },
    {
      key: "sms",
      label: "문자",
      badgeType: "sms",
      icon: <MessageCircle size={18} />,
      action: ({ url }) => {
        window.location.href = `sms:?body=${encodeURIComponent(`${shareText} ${url}`)}`;
      },
    },
    {
      key: "mail",
      label: "메일",
      badgeType: "mail",
      icon: <Mail size={18} />,
      action: ({ url, title }) => {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
      },
    },
    {
      key: "copy",
      label: "링크 복사",
      badgeType: "copy",
      icon: <LinkIcon size={18} />,
      action: ({ url }) => copyLink(url, () => showToast("링크가 복사됐어요.")),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:border-primary/40 hover:text-primary",
          className
        )}
      >
        <Share2 size={15} />
        공유
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">공유하기</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="닫기">
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-y-4">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => opt.action({ url: getUrl(), title })}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <IconBadge type={opt.badgeType as never} size={48}>
                    {opt.icon}
                  </IconBadge>
                  <span className="text-xs font-medium text-foreground/80">{opt.label}</span>
                </button>
              ))}
            </div>

            {toast && <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-center text-xs font-medium text-foreground/80">{toast}</p>}
          </div>
        </div>
      )}
    </>
  );
}
