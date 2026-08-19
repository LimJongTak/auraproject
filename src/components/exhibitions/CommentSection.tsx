"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addComment, deleteComment, subscribeComments } from "@/lib/firestore/comments";
import type { ExhibitionComment } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

const AVATAR_COLORS = [
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

function avatarColor(name: string): string {
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export function CommentSection({ exhibitionId }: { exhibitionId: string }) {
  const { firebaseUser, profile } = useAuth();
  const [comments, setComments] = useState<ExhibitionComment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeComments(exhibitionId, setComments);
    return () => unsub();
  }, [exhibitionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !profile || !text.trim()) return;
    setSubmitting(true);
    try {
      await addComment(exhibitionId, firebaseUser.uid, profile.name, text.trim());
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    await deleteComment(exhibitionId, commentId);
  }

  return (
    <div className="flex flex-col gap-6">
      {firebaseUser ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            placeholder="응원의 한마디를 남겨주세요"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            className="min-h-20"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{text.length}/500</span>
            <Button type="submit" size="sm" loading={submitting} disabled={!text.trim()}>
              댓글 작성
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">
          댓글을 작성하려면 <a href="/login" className="font-semibold text-primary">로그인</a>이 필요해요.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {comments.map((comment) => (
          <li key={comment.id} className="flex items-start gap-3 py-4 first:pt-0">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(comment.authorName)}`}
            >
              {comment.authorName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{comment.authorName}</span>
                <span className="text-xs text-muted">
                  {comment.createdAt ? formatRelative(comment.createdAt.toDate()) : ""}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{comment.text}</p>
            </div>
            {firebaseUser &&
              (firebaseUser.uid === comment.authorUid || profile?.role === "admin") && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="shrink-0 text-muted hover:text-red-600"
                  aria-label="댓글 삭제"
                >
                  <Trash2 size={14} />
                </button>
              )}
          </li>
        ))}
        {comments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
            <MessageCircle size={28} className="text-border" />
            <p className="text-sm">첫 응원 댓글을 남겨보세요.</p>
          </div>
        )}
      </ul>
    </div>
  );
}
