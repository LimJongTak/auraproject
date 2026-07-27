"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAnnouncement } from "@/lib/firestore/announcements";
import type { Announcement } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { RichText } from "@/components/ui/RichText";

function formatDate(ts: Announcement["createdAt"] | null): string {
  return ts ? ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
}

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null | undefined>(undefined);

  useEffect(() => {
    getAnnouncement(params.id).then(setAnnouncement);
  }, [params.id]);

  if (announcement === undefined) return <CenteredSpinner />;
  if (announcement === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="공지사항을 찾을 수 없어요" description="삭제되었거나 존재하지 않는 게시글이에요." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "공지사항", href: "/notices" }, { label: announcement.title }]} />

      <div className="mt-6 border-b border-border pb-5">
        <h1 className="text-2xl font-extrabold">{announcement.title}</h1>
        <p className="mt-2 text-sm text-muted">{formatDate(announcement.createdAt)}</p>
      </div>

      {announcement.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={announcement.imageUrl} alt="" className="mt-6 w-full rounded-2xl object-cover" />
      )}
      <RichText
        content={announcement.content}
        className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground/90"
      />
    </div>
  );
}
