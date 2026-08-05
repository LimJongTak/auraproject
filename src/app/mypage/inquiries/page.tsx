"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeMyInquiries } from "@/lib/firestore/inquiries";
import type { Inquiry } from "@/types/models";
import { CenteredSpinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";

const INQUIRY_STATUS_LABEL: Record<Inquiry["status"], { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-surface text-muted" },
  answered: { label: "답변완료", className: "bg-primary-light text-primary-dark" },
};

export default function MyInquiriesPage() {
  const { profile } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyInquiries(profile.uid, setInquiries);
    return () => unsub();
  }, [profile?.uid]);

  if (!profile) return <CenteredSpinner />;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <MessageCircle className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">내 문의</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">문의 내역</h2>
          <Link href="/inquiries" className="flex items-center gap-1 text-sm font-semibold text-primary">
            새 문의 작성 <ArrowRight size={14} />
          </Link>
        </div>
        {inquiries === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : inquiries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 남긴 문의가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {inquiries.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm">
                <span className="truncate font-medium">{q.title}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    INQUIRY_STATUS_LABEL[q.status].className
                  )}
                >
                  {INQUIRY_STATUS_LABEL[q.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
