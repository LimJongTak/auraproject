// lucide-react doesn't ship brand/logo icons, so reference-link buttons use a
// small hand-rolled monochrome icon set instead (matches lucide's stroke-icon
// sizing conventions: 24x24 viewBox, `size`/`className` props).
import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function InstagramIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AppStoreIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M16.5 2.3c.1 1-.3 2-.9 2.7-.6.7-1.6 1.3-2.6 1.2-.1-1 .4-2 1-2.7.6-.7 1.7-1.3 2.5-1.2Z" />
      <path d="M19.8 17c-.4 1-.7 1.4-1.2 2.2-.7 1.1-1.7 2.5-3 2.5-1.1 0-1.4-.7-2.9-.7s-1.8.7-2.9.7c-1.3 0-2.2-1.3-2.9-2.3-2-2.9-2.2-6.4-1-8.2.9-1.3 2.3-2.1 3.6-2.1 1.3 0 2.1.8 3.2.8 1 0 1.7-.8 3.2-.8 1.2 0 2.4.6 3.3 1.7-2.9 1.6-2.4 5.7.6 6.2Z" />
    </svg>
  );
}

export function GooglePlayIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M4.5 3.6c-.3.3-.5.7-.5 1.2v14.4c0 .5.2.9.5 1.2l.1.1L13 12l-8.4-8.5-.1.1Z" />
      <path d="M15.9 14.9 13 12l2.9-2.9 3.6 2.1c1 .6 1 1.5 0 2.1l-3.6 2.1Z" />
      <path d="M4.6 20.4c.3.2.7.2 1.1 0L15.9 14.9 13 12 4.6 20.4Z" opacity=".7" />
      <path d="M4.6 3.6 13 12l2.9-2.9L5.7 3.6c-.4-.2-.8-.2-1.1 0Z" opacity=".9" />
    </svg>
  );
}

export function XIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M4 3h4.2l4 5.6L16.8 3H20l-6.4 8.1L20.4 21h-4.2l-4.4-6.1L6.8 21H3.6l6.8-8.6L4 3Z" />
    </svg>
  );
}

export function FacebookIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M14 22v-8h2.7l.4-3.3H14V8.5c0-.9.3-1.6 1.7-1.6h1.5V3.9c-.3 0-1.2-.1-2.2-.1-2.3 0-3.8 1.4-3.8 3.9v2.9H8.9v3.3H11v8h3Z" />
    </svg>
  );
}

export function ThreadsIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 21c-4.5 0-7-2.3-7-7.5v-3C5 5.8 7.3 3 12 3s7 2.6 7 6.8c0 2.7-1.2 4-3 4-1.4 0-2.2-.8-2.4-1.8" />
      <path d="M14.5 10.2c0-2-1.2-2.9-2.8-2.9-1.9 0-3.2 1-3.2 2.6 0 1.5 1.2 2.3 2.8 2.3 2.4 0 3.7-1.2 3.7-3.3 0-2.8-1.8-4.4-4.5-4.4" />
    </svg>
  );
}

const BADGE_STYLES: Record<string, string> = {
  homepage: "bg-surface text-muted",
  instagram: "text-white bg-[radial-gradient(circle_at_30%_110%,#fdf497,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]",
  youtube: "bg-[#FF0000] text-white",
  appStore: "bg-black text-white",
  googlePlay: "bg-white text-[#00C2FF] border border-border",
  x: "bg-black text-white",
  facebook: "bg-[#1877F2] text-white",
  threads: "bg-black text-white",
  mail: "bg-red-500 text-white",
  sms: "bg-emerald-500 text-white",
  copy: "bg-surface text-muted",
};

export function IconBadge({ type, children, size = 40 }: { type: keyof typeof BADGE_STYLES; children: React.ReactNode; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${BADGE_STYLES[type]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}
