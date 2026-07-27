"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/auth/Guard";
import { useAuth } from "@/hooks/useAuth";
import { answerInquiry, deleteInquiry, listAllInquiriesForAdmin } from "@/lib/firestore/inquiries";
import type { Inquiry } from "@/types/models";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, CenteredSpinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";

function formatDate(ts: Inquiry["createdAt"] | null): string {
  return ts ? ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
}

const STATUS_LABEL: Record<Inquiry["status"], { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-surface text-muted" },
  answered: { label: "답변완료", className: "bg-primary-light text-primary-dark" },
};

export default function AdminInquiriesPage() {
  return (
    <RequireAdmin>
      <InquiriesManager />
    </RequireAdmin>
  );
}

function InquiriesManager() {
  const { firebaseUser } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function refresh() {
    listAllInquiriesForAdmin().then(setInquiries);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 문의를 삭제할까요?")) return;
    await deleteInquiry(id);
    refresh();
  }

  if (inquiries === null) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "관리자", href: "/admin" }, { label: "문의 관리" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">문의 관리</h1>

      {inquiries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">아직 접수된 문의가 없어요.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {inquiries.map((q) => (
            <li key={q.id} className="rounded-2xl border border-border bg-white p-5">
              <button
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setOpenId(openId === q.id ? null : q.id)}
              >
                <div>
                  <p className="font-bold">{q.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {q.authorName} · {formatDate(q.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    STATUS_LABEL[q.status].className
                  )}
                >
                  {STATUS_LABEL[q.status].label}
                </span>
              </button>

              {openId === q.id && firebaseUser && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">{q.content}</p>
                  <AnswerForm inquiry={q} adminUid={firebaseUser.uid} onSaved={refresh} />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="flex items-center gap-1 text-xs text-muted hover:text-red-600"
                    >
                      <Trash2 size={13} /> 문의 삭제
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnswerForm({ inquiry, adminUid, onSaved }: { inquiry: Inquiry; adminUid: string; onSaved: () => void }) {
  const [answer, setAnswer] = useState(inquiry.answer ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      await answerInquiry(inquiry.id, answer.trim(), adminUid);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <Textarea
        label="답변"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="min-h-28"
        placeholder="답변을 입력하세요"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={submitting} disabled={!answer.trim()}>
          {inquiry.status === "answered" ? "답변 수정" : "답변 등록"}
        </Button>
      </div>
    </form>
  );
}
