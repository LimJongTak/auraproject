"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementInput,
} from "@/lib/firestore/announcements";
import { uploadAnnouncementImage } from "@/lib/storage/uploadAnnouncementImage";
import { insertAtCursor } from "@/lib/utils/insertAtCursor";
import type { Announcement } from "@/types/models";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { ImageInsertButton } from "@/components/ui/ImageInsertButton";
import { stripInlineImages } from "@/components/ui/RichText";

function formatDate(ts: Announcement["createdAt"] | null): string {
  return ts ? ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
}

export default function AdminNoticesPage() {
  const { firebaseUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);

  useEffect(() => {
    const unsub = subscribeAnnouncements(setAnnouncements);
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 공지사항을 삭제할까요?")) return;
    await deleteAnnouncement(id);
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="공지사항 관리"
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={16} /> 새 공지
          </Button>
        }
      />

      {editing && firebaseUser && (
        <NoticeForm
          initial={editing === "new" ? null : editing}
          uid={firebaseUser.uid}
          onDone={() => setEditing(null)}
        />
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {announcements.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                )}
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{stripInlineImages(a.content)}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(a.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setEditing(a)} className="text-muted hover:text-primary">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(a.id)} className="text-muted hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoticeForm({
  initial,
  uid,
  onDone,
}: {
  initial: Announcement | null;
  uid: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      setImageUrl(await uploadAnnouncementImage(file));
    } catch {
      setError("이미지 업로드에 실패했어요");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    const input: AnnouncementInput = { title: title.trim(), content: content.trim(), imageUrl };
    try {
      if (initial) {
        await updateAnnouncement(initial.id, input);
      } else {
        await createAnnouncement(input, uid);
      }
      onDone();
    } catch {
      setError("저장에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-white p-5">
      <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">내용</span>
          <ImageInsertButton
            upload={uploadAnnouncementImage}
            onInsert={(markdown) => setContent((prev) => insertAtCursor(contentRef.current, prev, markdown))}
          />
        </div>
        <Textarea ref={contentRef} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-40" />
        <span className="text-xs text-muted">
          이미지를 삽입하면 본문에 자동으로 링크가 추가돼요. JPG, PNG, WebP 등 (최대 5MB) · 권장 규격 1200×675px (16:9 가로형)
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">대표 이미지 (선택, 목록·상세 미리보기에 표시)</span>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        <span className="text-xs text-muted">JPG, PNG, WebP 등 이미지 파일 (최대 5MB) · 권장 규격 1200×630px (가로형)</span>
        {uploadingImage && <span className="text-xs text-muted">업로드 중...</span>}
        {imageUrl && (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-24 w-auto rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              이미지 내리기
            </button>
          </div>
        )}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          취소
        </Button>
        <Button type="submit" size="sm" loading={submitting}>
          저장
        </Button>
      </div>
    </form>
  );
}
