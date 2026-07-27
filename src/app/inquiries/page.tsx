"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/Guard";
import { createInquiry, subscribeMyInquiries } from "@/lib/firestore/inquiries";
import type { Inquiry } from "@/types/models";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, ErrorText } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";

function formatDate(ts: Inquiry["createdAt"] | null): string {
  return ts ? ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
}

const STATUS_LABEL: Record<Inquiry["status"], { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-surface text-muted" },
  answered: { label: "답변완료", className: "bg-primary-light text-primary-dark" },
};

export default function InquiriesPage() {
  return (
    <RequireAuth>
      <InquiriesContent />
    </RequireAuth>
  );
}

function InquiriesContent() {
  const { firebaseUser, profile } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeMyInquiries(firebaseUser.uid, setInquiries);
    return () => unsub();
  }, [firebaseUser]);

  if (!firebaseUser || !profile) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "문의하기" }]} />
      <div className="mt-4 mb-8 flex items-center gap-2">
        <MessageSquare className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">문의하기</h1>
      </div>

      <NewInquiryForm uid={firebaseUser.uid} authorName={profile.name} />

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-bold text-muted">내 문의 목록</h2>
        {inquiries === null ? (
          <p className="text-sm text-muted">불러오는 중...</p>
        ) : inquiries.length === 0 ? (
          <p className="text-sm text-muted">아직 남긴 문의가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {inquiries.map((q) => (
              <li key={q.id} className="rounded-2xl border border-border bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{q.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      STATUS_LABEL[q.status].className
                    )}
                  >
                    {STATUS_LABEL[q.status].label}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{q.content}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(q.createdAt)}</p>
                {q.status === "answered" && q.answer && (
                  <div className="mt-4 rounded-xl bg-surface p-4">
                    <p className="text-xs font-semibold text-primary">관리자 답변</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm">{q.answer}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NewInquiryForm({ uid, authorName }: { uid: string; authorName: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createInquiry({ uid, authorName, title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
    } catch {
      setError("문의 등록에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
      <h2 className="font-bold">새 문의 작성</h2>
      <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      <Textarea
        label="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-32"
        maxLength={1000}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" loading={submitting} disabled={!title.trim() || !content.trim()}>
        문의 등록
      </Button>
    </form>
  );
}
