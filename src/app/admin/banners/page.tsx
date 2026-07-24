"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAdmin } from "@/components/auth/Guard";
import { useAuth } from "@/hooks/useAuth";
import { subscribeCategories, updateCategoryBannerImage, updateCategoryThemeReveal } from "@/lib/firestore/categories";
import { subscribeBannerTheme, setBannerTheme, deleteBannerTheme } from "@/lib/firestore/bannerThemes";
import { uploadThemeImage } from "@/lib/storage/uploadThemeImage";
import { formatDateRange } from "@/lib/utils/dateWindow";
import type { BannerTheme, Category } from "@/types/models";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, ErrorText } from "@/components/ui/misc";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminBannersPage() {
  return (
    <RequireAdmin>
      <BannersManager />
    </RequireAdmin>
  );
}

function BannersManager() {
  const { firebaseUser } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "관리자", href: "/admin" }, { label: "배너 관리" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">배너 관리</h1>
      <p className="mt-1 text-sm text-muted">
        배너 이미지를 등록한 대회만 메인 화면 상단에 노출돼요. 신청 시작 카운트다운은 카테고리 관리에서 설정한
        게시 시작 시각을 그대로 사용해요.
      </p>

      {categories === null && <p className="mt-8 text-sm text-muted">불러오는 중...</p>}
      {categories !== null && categories.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          먼저{" "}
          <Link href="/admin/categories" className="font-semibold text-primary">
            카테고리 관리
          </Link>
          에서 대회를 만들어주세요.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {categories?.map((c) => (
          <BannerCard key={c.id} category={c} uid={firebaseUser?.uid ?? ""} />
        ))}
      </div>
    </div>
  );
}

function BannerCard({ category, uid }: { category: Category; uid: string }) {
  const [bannerImageUrl, setBannerImageUrl] = useState(category.bannerImageUrl);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [theme, setThemeState] = useState<BannerTheme | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBannerImageUrl(category.bannerImageUrl);
  }, [category.bannerImageUrl]);

  useEffect(() => {
    const unsub = subscribeBannerTheme(category.id, (t) => setThemeState(t));
    return () => unsub();
  }, [category.id]);

  async function handleBannerImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setError(null);
    try {
      const url = await uploadThemeImage(file);
      await updateCategoryBannerImage(category.id, url);
      setBannerImageUrl(url);
    } catch {
      setError("배너 이미지 업로드에 실패했어요");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleRemoveBanner() {
    if (!confirm("이 대회의 배너를 메인 화면에서 내릴까요?")) return;
    await updateCategoryBannerImage(category.id, null);
    setBannerImageUrl(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">{category.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            신청 시작: {formatDateRange(category.submissionOpenAt, category.submissionCloseAt)}{" "}
            <Link href="/admin/categories" className="font-semibold text-primary">
              (카테고리 관리에서 수정)
            </Link>
          </p>
        </div>
        {bannerImageUrl && (
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
            홈 화면에 노출 중
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-semibold">배너 이미지</span>
        <input type="file" accept="image/*" onChange={handleBannerImageChange} />
        {uploadingBanner && <span className="text-xs text-muted">업로드 중...</span>}
        {bannerImageUrl && (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerImageUrl} alt={category.name} className="h-24 w-auto rounded-xl object-cover" />
            <button onClick={handleRemoveBanner} className="text-xs font-semibold text-red-600 hover:underline">
              배너 내리기
            </button>
          </div>
        )}
      </div>

      {error && <div className="mt-3">{<ErrorText>{error}</ErrorText>}</div>}

      <div className="mt-5 border-t border-border pt-4">
        {theme !== undefined && <ThemeRevealForm category={category} current={theme} uid={uid} />}
      </div>
    </div>
  );
}

function ThemeRevealForm({
  category,
  current,
  uid,
}: {
  category: Category;
  current: BannerTheme | null;
  uid: string;
}) {
  const categoryId = category.id;
  const [enabled, setEnabled] = useState(!!current);
  const [revealAt, setRevealAt] = useState(() =>
    toLocalInputValue(category.themeRevealAt?.toDate() ?? new Date(Date.now() + 3600_000))
  );
  const [title, setTitle] = useState(current?.themeTitle ?? "");
  const [description, setDescription] = useState(current?.themeDescription ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(current?.themeImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadThemeImage(file);
      setImageUrl(url);
    } catch {
      setError("이미지 업로드에 실패했어요");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("주제 제목을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await Promise.all([
        updateCategoryThemeReveal(categoryId, new Date(revealAt)),
        setBannerTheme(
          categoryId,
          { themeTitle: title.trim(), themeDescription: description.trim(), themeImageUrl: imageUrl },
          uid
        ),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("저장에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    if (!confirm("이 대회의 주제 공개를 배너에서 없앨까요?")) return;
    await Promise.all([deleteBannerTheme(categoryId), updateCategoryThemeReveal(categoryId, null)]);
    setEnabled(false);
    setTitle("");
    setDescription("");
    setImageUrl(null);
  }

  if (!enabled) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">이 대회는 주제 공개 카운트다운이 없어요.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setEnabled(true)}>
          주제 공개 추가
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">주제 공개</span>
        <button type="button" onClick={handleDisable} className="text-xs font-semibold text-red-600 hover:underline">
          주제 공개 안 함
        </button>
      </div>
      <Input label="주제 공개 시각" type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} />
      <Input label="주제 제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      <Textarea label="주제 설명" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">주제 이미지 (선택)</span>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        {uploading && <span className="text-xs text-muted">업로드 중...</span>}
        {imageUrl && (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="주제 이미지" className="h-24 w-auto rounded-xl object-cover" />
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
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={submitting}>
          저장
        </Button>
        {saved && <span className="text-sm font-medium text-green-600">저장됐어요</span>}
      </div>
    </form>
  );
}
