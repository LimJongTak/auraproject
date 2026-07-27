import type { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  school: string;
  department: string;
  grade: string;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
