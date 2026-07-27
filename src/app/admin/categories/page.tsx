"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/auth/Guard";
import { subscribeCategories, createCategory, updateCategory, deleteCategory, type CategoryInput } from "@/lib/firestore/categories";
import { uploadThemeImage } from "@/lib/storage/uploadThemeImage";
import { insertAtCursor } from "@/lib/utils/insertAtCursor";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import type { Category } from "@/types/models";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, ErrorText } from "@/components/ui/misc";
import { ImageInsertButton } from "@/components/ui/ImageInsertButton";
import { cn } from "@/lib/utils/cn";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTeamSize(min: number | undefined, max: number | null | undefined): string {
  const lo = min ?? 1;
  return max != null ? `${lo}~${max}명` : `${lo}명 이상`;
}

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  before: { label: "게시 예정", className: "bg-blue-50 text-blue-600" },
  open: { label: "게시 중", className: "bg-green-50 text-green-600" },
  closed: { label: "게시 마감", className: "bg-surface text-muted" },
};

export default function AdminCategoriesPage() {
  return (
    <RequireAdmin>
      <CategoriesManager />
    </RequireAdmin>
  );
}

function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 카테고리를 삭제할까요? 등록된 전시물에는 영향을 주지 않아요.")) return;
    await deleteCategory(id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "관리자", href: "/admin" }, { label: "카테고리 관리" }]} />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">카테고리 관리</h1>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={16} /> 새 카테고리
        </Button>
      </div>

      {editing && (
        <CategoryForm
          initial={editing === "new" ? null : editing}
          nextOrder={categories.length}
          onDone={() => setEditing(null)}
        />
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {categories.map((c) => {
          const state = getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt);
          return (
            <li key={c.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {c.bannerImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.bannerImageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  )}
                  <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{c.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATE_LABEL[state].className)}>
                      {STATE_LABEL[state].label}
                    </span>
                    {!c.isActive && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">비활성</span>
                    )}
                  </div>
                  {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateRange(c.submissionOpenAt, c.submissionCloseAt)}</p>
                  <p className="mt-1 text-xs text-muted">팀 인원 {formatTeamSize(c.teamSizeMin, c.teamSizeMax)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setEditing(c)} className="text-muted hover:text-primary">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CategoryForm({
  initial,
  nextOrder,
  onDone,
}: {
  initial: Category | null;
  nextOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [detailContent, setDetailContent] = useState(initial?.detailContent ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [openAt, setOpenAt] = useState(() =>
    initial ? toLocalInputValue(initial.submissionOpenAt.toDate()) : toLocalInputValue(new Date())
  );
  const [closeAt, setCloseAt] = useState(() =>
    initial
      ? toLocalInputValue(initial.submissionCloseAt.toDate())
      : toLocalInputValue(new Date(Date.now() + 7 * 86400000))
  );
  const [teamSizeMin, setTeamSizeMin] = useState(String(initial?.teamSizeMin ?? 1));
  const [teamSizeMax, setTeamSizeMax] = useState(initial?.teamSizeMax != null ? String(initial.teamSizeMax) : "");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(initial?.bannerImageUrl ?? null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initial?.thumbnailUrl ?? null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const detailContentRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleBannerImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setError(null);
    try {
      setBannerImageUrl(await uploadThemeImage(file));
    } catch {
      setError("배너 이미지 업로드에 실패했어요");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    setError(null);
    try {
      setThumbnailUrl(await uploadThemeImage(file));
    } catch {
      setError("미리보기 이미지 업로드에 실패했어요");
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const openDate = new Date(openAt);
    const closeDate = new Date(closeAt);
    if (closeDate <= openDate) {
      setError("마감일은 시작일 이후여야 해요");
      return;
    }
    const min = Math.max(1, parseInt(teamSizeMin, 10) || 1);
    const max = teamSizeMax.trim() === "" ? null : Math.max(1, parseInt(teamSizeMax, 10) || 1);
    if (max != null && max < min) {
      setError("최대 인원은 최소 인원보다 크거나 같아야 해요");
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: CategoryInput = {
      name: name.trim(),
      description: description.trim() || null,
      detailContent: detailContent.trim() || null,
      order: initial?.order ?? nextOrder,
      isActive,
      submissionOpenAt: openDate,
      submissionCloseAt: closeDate,
      teamSizeMin: min,
      teamSizeMax: max,
      bannerImageUrl,
      thumbnailUrl,
    };
    try {
      if (initial) {
        await updateCategory(initial.id, input);
      } else {
        await createCategory(input);
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
      <Input label="카테고리 이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <Textarea
        label="설명 (선택, 짧게 — 목록·배너에 표시)"
        value={description ?? ""}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">상세 설명 (선택, 길게 — 대회 상세페이지 본문)</span>
          <ImageInsertButton
            upload={uploadThemeImage}
            onInsert={(markdown) =>
              setDetailContent((prev) => insertAtCursor(detailContentRef.current, prev, markdown))
            }
          />
        </div>
        <Textarea
          ref={detailContentRef}
          value={detailContent ?? ""}
          onChange={(e) => setDetailContent(e.target.value)}
          maxLength={2000}
          className="min-h-40"
        />
        <span className="text-xs text-muted">
          이미지를 삽입하면 본문에 자동으로 링크가 추가돼요. JPG, PNG, WebP 등 (최대 5MB) · 권장 규격 1200×675px (16:9 가로형)
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="게시 시작" type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
        <Input label="게시 마감" type="datetime-local" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="최소 인원"
          type="number"
          min={1}
          value={teamSizeMin}
          onChange={(e) => setTeamSizeMin(e.target.value)}
        />
        <Input
          label="최대 인원 (비워두면 제한없음)"
          type="number"
          min={1}
          placeholder="제한없음"
          value={teamSizeMax}
          onChange={(e) => setTeamSizeMax(e.target.value)}
        />
      </div>
      <p className="-mt-2 text-xs text-muted">1인 대회는 최소/최대 모두 1로 설정하세요.</p>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">배너 이미지 (선택, 등록하면 메인 화면 상단에 노출)</span>
        <input type="file" accept="image/*" onChange={handleBannerImageChange} />
        <span className="text-xs text-muted">JPG, PNG, WebP 등 이미지 파일 (최대 5MB) · 권장 규격 1600×600px (가로형)</span>
        {uploadingBanner && <span className="text-xs text-muted">업로드 중...</span>}
        {bannerImageUrl && (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerImageUrl} alt="" className="h-24 w-auto rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setBannerImageUrl(null)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              배너 내리기
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">미리보기 이미지 (선택, 대회 목록 카드에 표시)</span>
        <input type="file" accept="image/*" onChange={handleThumbnailChange} />
        <span className="text-xs text-muted">JPG, PNG, WebP 등 이미지 파일 (최대 5MB) · 권장 규격 800×400px (2:1 가로형)</span>
        {uploadingThumbnail && <span className="text-xs text-muted">업로드 중...</span>}
        {thumbnailUrl && (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="" className="h-24 w-auto rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setThumbnailUrl(null)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              이미지 내리기
            </button>
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        목록에 노출
      </label>
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
