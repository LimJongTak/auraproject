import type { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin" | "judge";

export type MemberType = "student" | "staff";

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  memberType: MemberType;
  school: string;
  department: string;
  grade: string;
  // 학생이면 학번(숫자 8자리), 교직원이면 사번(자유 입력, 선택).
  studentId: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Team {
  id: string; // == invite code
  name: string;
  categoryId: string;
  categoryName: string;
  leaderUid: string;
  memberUids: string[];
  createdAt: Timestamp;
}

// Doc ID: `${uid}_${categoryId}` — its existence is what enforces "at most
// one team per contest per user" (see firestore.rules).
export interface TeamMembership {
  uid: string;
  categoryId: string;
  teamId: string;
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  // Longer free-text body for the contest detail page (/contest/[id]),
  // separate from the short `description` used in listings/banners.
  detailContent: string | null;
  order: number;
  isActive: boolean;
  submissionOpenAt: Timestamp;
  submissionCloseAt: Timestamp;
  bannerImageUrl: string | null;
  // Shown as the card preview image on the /contest list page — distinct from
  // bannerImageUrl, which is the large hero image on the home page banner.
  thumbnailUrl: string | null;
  teamSizeMin: number;
  teamSizeMax: number | null;
  // Public on purpose (unlike the theme content below): visitors need it to
  // render a "reveal in" countdown before the theme itself is readable.
  themeRevealAt: Timestamp | null;
  // Informational only — shown on the contest announcement page. There is no
  // mileage ledger/wallet system; this does not actually credit anyone.
  baseMileage: number;
  // Judging rubric, written by the admin when opening the contest. Items are
  // scored individually by judges — see Evaluation below.
  rubric: RubricItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RubricItem {
  id: string;
  group: string; // e.g. 독창성/사업성/전달력
  label: string; // 세부 항목
  criteria: string; // 심사 기준
  maxScore: number;
}

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string | null;
  fetchedAt: Timestamp | null;
}

export type ExhibitionStatus = "draft" | "published" | "hidden";

export interface Exhibition {
  id: string;
  teamId: string;
  teamName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  oneLiner: string;
  year: number;
  projectUrl: string | null;
  linkPreview: LinkPreviewData | null;
  thumbnailUrl: string | null;
  pageImageUrls: string[];
  pageCount: number;
  likeCount: number;
  commentCount: number;
  status: ExhibitionStatus;
  submittedByUid: string;
  // Set by an admin after judging closes. Shown on MyPage and wherever the
  // exhibition itself is already publicly visible.
  award: { label: string; rank: number } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExhibitionLike {
  createdAt: Timestamp;
}

export interface ExhibitionComment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
}

// Gated content only — see Category.themeRevealAt for the (public) reveal time.
export interface BannerTheme {
  themeTitle: string;
  themeDescription: string;
  themeImageUrl: string | null;
  updatedAt: Timestamp;
  updatedBy: string;
}

export type SortOption = "popular" | "latest";

// Doc ID: `${judgeUid}_${exhibitionId}` — at most one evaluation per judge
// per submission, enforced in firestore.rules.
export interface Evaluation {
  id: string;
  exhibitionId: string;
  categoryId: string;
  judgeUid: string;
  judgeName: string;
  scores: Record<string, number>; // RubricItem.id -> score
  totalScore: number;
  comment: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  authorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InquiryStatus = "pending" | "answered";

export interface Inquiry {
  id: string;
  uid: string;
  authorName: string;
  title: string;
  content: string;
  status: InquiryStatus;
  answer: string | null;
  answeredAt: Timestamp | null;
  answeredBy: string | null;
  createdAt: Timestamp;
}

// Doc ID == date ("YYYY-MM-DD", local time of the visiting browser).
// One doc per calendar day, count incremented once per browser session.
export interface VisitStat {
  date: string;
  count: number;
  updatedAt: Timestamp;
}

// Curated icon key, not a free-form asset upload — see
// src/lib/constants/quickLinkIcons.tsx for the actual icon components.
export type QuickLinkIcon =
  | "book-open"
  | "library"
  | "sparkles"
  | "bot"
  | "wand"
  | "graduation-cap"
  | "link"
  | "globe"
  | "message-circle"
  | "newspaper"
  | "video"
  | "calendar"
  | "help-circle"
  | "star"
  | "rocket"
  | "megaphone"
  | "compass";

// Built-in info card shown in a modal instead of navigating to `url` when
// set — see src/components/quicklinks for the actual card content per key.
export type QuickLinkContentKey = "aura-mileage";

// Floating quick-link menu shown on the right edge of the page (desktop
// only). Public read, admin-managed.
export interface QuickLink {
  id: string;
  label: string;
  url: string;
  icon: QuickLinkIcon;
  contentKey: QuickLinkContentKey | null;
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
