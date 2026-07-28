import {
  BookOpen,
  Bot,
  Calendar,
  Compass,
  Globe,
  GraduationCap,
  HelpCircle,
  Library,
  Link2,
  Megaphone,
  MessageCircle,
  Newspaper,
  Rocket,
  Sparkles,
  Star,
  Video,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { QuickLinkIcon } from "@/types/models";

export const QUICK_LINK_ICONS: Record<QuickLinkIcon, { label: string; Icon: LucideIcon }> = {
  "book-open": { label: "책", Icon: BookOpen },
  library: { label: "도서관", Icon: Library },
  sparkles: { label: "반짝임 (AI)", Icon: Sparkles },
  bot: { label: "로봇 (AI)", Icon: Bot },
  wand: { label: "마법봉 (AI)", Icon: Wand2 },
  "graduation-cap": { label: "학사모", Icon: GraduationCap },
  link: { label: "링크", Icon: Link2 },
  globe: { label: "웹사이트", Icon: Globe },
  "message-circle": { label: "채팅", Icon: MessageCircle },
  newspaper: { label: "뉴스", Icon: Newspaper },
  video: { label: "영상", Icon: Video },
  calendar: { label: "일정", Icon: Calendar },
  "help-circle": { label: "안내", Icon: HelpCircle },
  star: { label: "별", Icon: Star },
  rocket: { label: "로켓", Icon: Rocket },
  megaphone: { label: "공지", Icon: Megaphone },
  compass: { label: "나침반", Icon: Compass },
};

export const DEFAULT_QUICK_LINK_ICON: QuickLinkIcon = "link";
