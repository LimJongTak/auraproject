"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2, Unlock } from "lucide-react";
import { subscribeCategories, createCategory, updateCategory, deleteCategory, type CategoryInput } from "@/lib/firestore/categories";
import { listEvaluationsForCategory } from "@/lib/firestore/evaluations";
import { uploadThemeImage } from "@/lib/storage/uploadThemeImage";
import { insertAtCursor } from "@/lib/utils/insertAtCursor";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import { DEFAULT_RUBRIC } from "@/lib/constants/defaultRubric";
import { CONTEST_TYPES, type Category, type ContestType, type RubricItem } from "@/types/models";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { ImageInsertButton } from "@/components/ui/ImageInsertButton";
import { cn } from "@/lib/utils/cn";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTeamSize(min: number | undefined, max: number | null | undefined): string {
  const lo = min ?? 1;
  if (max != null && max === lo) return `${lo}명`;
  return max != null ? `${lo}~${max}명` : `${lo}명 이상`;
}

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  before: { label: "게시 예정", className: "bg-blue-50 text-blue-600" },
  open: { label: "게시 중", className: "bg-green-50 text-green-600" },
  closed: { label: "게시 마감", className: "bg-surface text-muted" },
};

export default function AdminCategoriesPage() {
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
    <div className="max-w-3xl">
      <AdminPageHeader
        title="카테고리 관리"
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={16} /> 새 카테고리
          </Button>
        }
      />

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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{c.name}</p>
                    {c.contestType && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                        {c.contestType}
                      </span>
                    )}
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
  const [contestType, setContestType] = useState<ContestType>(initial?.contestType ?? CONTEST_TYPES[0]);
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
  const [baseMileage, setBaseMileage] = useState(String(initial?.baseMileage ?? 0));
  const [rubric, setRubric] = useState<RubricItem[]>(initial?.rubric ?? []);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(initial?.bannerImageUrl ?? null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initial?.thumbnailUrl ?? null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const detailContentRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Once judges have scored anything for this contest, editing the rubric
  // (removing/renaming items) can orphan or shift the meaning of scores
  // already keyed by the old item ids — so default to locked and require an
  // explicit unlock for existing contests that already have evaluations.
  const [evaluationCount, setEvaluationCount] = useState<number | null>(initial ? null : 0);
  const [rubricUnlocked, setRubricUnlocked] = useState(false);
  const rubricLocked = (evaluationCount ?? 0) > 0 && !rubricUnlocked;

  useEffect(() => {
    if (!initial) return;
    listEvaluationsForCategory(initial.id).then((evs) => setEvaluationCount(evs.length));
  }, [initial]);

  function addRubricItem() {
    if (rubricLocked) return;
    setRubric((prev) => [
      ...prev,
      { id: crypto.randomUUID(), group: "", label: "", criteria: "", maxScore: 10 },
    ]);
  }

  function updateRubricItem(id: string, patch: Partial<RubricItem>) {
    if (rubricLocked) return;
    setRubric((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRubricItem(id: string) {
    if (rubricLocked) return;
    setRubric((prev) => prev.filter((r) => r.id !== id));
  }

  function loadDefaultRubric() {
    if (rubricLocked) return;
    if (rubric.length > 0 && !confirm("현재 문항을 기본 10문항으로 교체할까요?")) return;
    setRubric(DEFAULT_RUBRIC.map((r) => ({ ...r })));
  }

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
    if (rubric.some((r) => !r.label.trim() || r.maxScore <= 0)) {
      setError("평가표 문항은 세부 항목과 배점(1점 이상)을 모두 입력해야 해요");
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: CategoryInput = {
      name: name.trim(),
      contestType,
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
      baseMileage: Math.max(0, parseInt(baseMileage, 10) || 0),
      rubric: rubric.map((r) => ({ ...r, label: r.label.trim(), criteria: r.criteria.trim(), group: r.group.trim() })),
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
      <Select
        label="카테고리 구분"
        value={contestType}
        onChange={(e) => setContestType(e.target.value as ContestType)}
      >
        {CONTEST_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
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
          이미지를 삽입하면 본문에 자동으로 링크가 추가돼요. JPG, PNG, WebP 등 (최대 5MB) · 일반 이미지는 1200×675px(16:9
          가로형), 포스터는 842×1191px(A3 세로형)를 추천해요 — 세로 이미지는 잘리지 않고 그대로 표시돼요.
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

      <Input
        label="기본 지급 마일리지 (참가자 안내용 숫자, 대회 공고에 표시돼요)"
        type="number"
        min={0}
        value={baseMileage}
        onChange={(e) => setBaseMileage(e.target.value)}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">평가표 (심사위원이 작품을 채점할 문항)</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={loadDefaultRubric} disabled={rubricLocked}>
              기본 10문항 불러오기
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addRubricItem} disabled={rubricLocked}>
              <Plus size={14} /> 문항 추가
            </Button>
          </div>
        </div>

        {(evaluationCount ?? 0) > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 text-amber-800">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <AlertTriangle size={14} /> 이미 채점된 평가가 {evaluationCount}건 있어요.
            </p>
            <p className="text-xs">
              문항을 수정·삭제하면 기존에 매겨진 점수가 화면에서 어긋날 수 있어요. 필요한 경우에만 잠금을
              해제해서 수정하세요.
            </p>
            {rubricLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setRubricUnlocked(true)}
              >
                <Unlock size={14} /> 잠금 해제하고 수정
              </Button>
            )}
          </div>
        )}

        {rubric.length === 0 ? (
          <p className="text-xs text-muted">아직 문항이 없어요. 기본 10문항을 불러오거나 직접 추가하세요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rubric.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="항목 (예: 독창성)"
                      value={r.group}
                      disabled={rubricLocked}
                      onChange={(e) => updateRubricItem(r.id, { group: e.target.value })}
                    />
                    <Input
                      placeholder="세부 항목 (예: 문제 정의)"
                      value={r.label}
                      disabled={rubricLocked}
                      onChange={(e) => updateRubricItem(r.id, { label: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="배점"
                      value={r.maxScore}
                      disabled={rubricLocked}
                      onChange={(e) => updateRubricItem(r.id, { maxScore: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRubricItem(r.id)}
                    disabled={rubricLocked}
                    className="mt-2.5 shrink-0 text-muted hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <Textarea
                  placeholder="심사 기준"
                  value={r.criteria}
                  disabled={rubricLocked}
                  onChange={(e) => updateRubricItem(r.id, { criteria: e.target.value })}
                  className="min-h-16"
                />
              </li>
            ))}
          </ul>
        )}
        {rubric.length > 0 && (
          <p className="text-right text-xs font-semibold text-muted">
            합계 {rubric.reduce((sum, r) => sum + r.maxScore, 0)}점
          </p>
        )}
      </div>

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
