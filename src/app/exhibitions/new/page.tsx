"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadCloud, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/Guard";
import { subscribeCategories } from "@/lib/firestore/categories";
import { createTeam, getTeam, subscribeMyMemberships, TeamError } from "@/lib/firestore/teams";
import { createDraftExhibition, publishExhibitionPages } from "@/lib/firestore/exhibitions";
import { renderPdfToImages, validatePdfFile, PdfValidationError, MAX_PDF_PAGES } from "@/lib/pdf/renderPdfToImages";
import { uploadExhibitionPages } from "@/lib/storage/uploadExhibitionPages";
import {
  uploadExhibitionThumbnail,
  validateThumbnailImage,
  ThumbnailValidationError,
} from "@/lib/storage/uploadExhibitionThumbnail";
import { exhibitionMetaSchema, type ExhibitionMetaValues } from "@/lib/validation/exhibitionSchema";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import type { Category, Team, TeamMembership } from "@/types/models";
import type { LinkPreviewApiResponse } from "@/lib/linkPreview/types";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { LiveLinkPreview } from "@/components/link-preview/LiveLinkPreview";
import { LinkPreviewHelp } from "@/components/link-preview/LinkPreviewHelp";
import { DeployHelp } from "@/components/exhibitions/DeployHelp";
import { PresentationHelp } from "@/components/exhibitions/PresentationHelp";

type SubmitPhase = "idle" | "creating" | "rendering" | "uploading" | "publishing" | "error";

export default function NewExhibitionPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <RequireAuth>
        <NewExhibitionForm />
      </RequireAuth>
    </Suspense>
  );
}

function NewExhibitionForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCategoryId = searchParams.get("categoryId") ?? "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [teamsByCategory, setTeamsByCategory] = useState<Record<string, Team>>({});
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExhibitionMetaValues>({
    resolver: zodResolver(exhibitionMetaSchema),
    defaultValues: { categoryId: presetCategoryId },
  });
  const projectUrl = watch("projectUrl") ?? "";
  const watchedCategoryId = watch("categoryId");
  const watchedCategory = categories.find((c) => c.id === watchedCategoryId) ?? null;
  const team = teamsByCategory[watchedCategoryId] ?? null;
  const teamName = team?.name ?? (watchedCategory?.teamSizeMax === 1 ? profile?.name : null) ?? null;

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!memberships) return;
    Promise.all(
      memberships.map((m) => getTeam(m.teamId).then((t) => [m.categoryId, t] as const))
    ).then((pairs) => {
      const map: Record<string, Team> = {};
      for (const [categoryId, t] of pairs) if (t) map[categoryId] = t;
      setTeamsByCategory(map);
    });
  }, [memberships]);

  const openCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.isActive &&
          getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt) === "open" &&
          // A team of exactly one doesn't need to be formed ahead of time — it's
          // auto-created on submit — so solo categories are always selectable.
          (teamsByCategory[c.id] || c.teamSizeMax === 1)
      ),
    [categories, teamsByCategory]
  );

  // Open, 2인 이상 대회인데 아직 팀이 없어서 카테고리 목록에 뜨지 않는 대회들 —
  // 왜 안 보이는지 알 수 있게 따로 안내해요.
  const missingTeamCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.isActive &&
          getSubmissionWindowState(c.submissionOpenAt, c.submissionCloseAt) === "open" &&
          c.teamSizeMax !== 1 &&
          !teamsByCategory[c.id]
      ),
    [categories, teamsByCategory]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    try {
      validatePdfFile(f);
      setFile(f);
    } catch (err) {
      setFile(null);
      setFileError(err instanceof PdfValidationError ? err.message : "PDF 파일을 확인해주세요");
    }
  }

  function handleThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setThumbnailError(null);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    if (!f) {
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      return;
    }
    try {
      validateThumbnailImage(f);
      setThumbnailFile(f);
      setThumbnailPreviewUrl(URL.createObjectURL(f));
    } catch (err) {
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      setThumbnailError(err instanceof ThumbnailValidationError ? err.message : "이미지 파일을 확인해주세요");
    }
  }

  async function onSubmit(values: ExhibitionMetaValues) {
    const category = categories.find((c) => c.id === values.categoryId);
    if (!category) {
      setError("카테고리를 다시 선택해주세요");
      return;
    }

    let submittingTeamId = teamsByCategory[values.categoryId]?.id;
    let submittingTeamName = teamsByCategory[values.categoryId]?.name;
    if (!submittingTeamId && category.teamSizeMax !== 1) {
      setError("이 대회에 참가한 팀이 없어요. 먼저 팀을 구성해주세요.");
      return;
    }

    setError(null);
    try {
      setPhase("creating");
      setProgress(null);

      if (!submittingTeamId) {
        // Solo category (teamSizeMax === 1): no need to have visited /team first —
        // provision the 1-member team transparently as part of submitting.
        try {
          submittingTeamId = await createTeam(profile!.uid, profile!.name, category.id, category.name);
          submittingTeamName = profile!.name;
        } catch (err) {
          setPhase("error");
          setError(err instanceof TeamError ? err.message : "참가 처리에 실패했어요");
          return;
        }
      }

      let linkPreview = null;
      if (values.projectUrl) {
        try {
          const res = await fetch(`/api/link-preview?url=${encodeURIComponent(values.projectUrl)}`);
          const json: LinkPreviewApiResponse = await res.json();
          if (json.ok) {
            linkPreview = {
              title: json.title ?? null,
              description: json.description ?? null,
              image: json.image ?? null,
              favicon: json.favicon ?? null,
              domain: json.domain ?? null,
              fetchedAt: null,
            };
          }
        } catch {
          // link preview is a nice-to-have; submission continues without it
        }
      }

      const exhibitionId = await createDraftExhibition({
        teamId: submittingTeamId,
        teamName: submittingTeamName!,
        categoryId: category.id,
        categoryName: category.name,
        title: values.title,
        oneLiner: values.oneLiner,
        projectUrl: values.projectUrl || null,
        linkPreview,
        submittedByUid: profile!.uid,
      });

      let pageImageUrls: string[] = [];
      let autoThumbnailUrl: string | null = null;

      if (file) {
        setPhase("rendering");
        const { pages, thumbnail } = await renderPdfToImages(file, (p) => {
          setProgress({ label: `PDF 변환 중 (${p.currentPage}/${p.totalPages}페이지)`, percent: (p.currentPage / p.totalPages) * 100 });
        });

        setPhase("uploading");
        const uploaded = await uploadExhibitionPages(exhibitionId, pages, thumbnail, (p) => {
          setProgress({ label: "이미지 업로드 중", percent: (p.bytesTransferred / p.totalBytes) * 100 });
        });
        pageImageUrls = uploaded.pageImageUrls;
        autoThumbnailUrl = uploaded.thumbnailUrl;
      }

      let manualThumbnailUrl: string | null = null;
      if (thumbnailFile) {
        setPhase("uploading");
        setProgress({ label: "대표 이미지 업로드 중", percent: 100 });
        manualThumbnailUrl = await uploadExhibitionThumbnail(exhibitionId, thumbnailFile);
      }

      setPhase("publishing");
      await publishExhibitionPages(exhibitionId, {
        pageImageUrls,
        pageCount: pageImageUrls.length,
        thumbnailUrl: manualThumbnailUrl ?? autoThumbnailUrl,
      });

      router.push(`/exhibitions/${exhibitionId}`);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "등록 중 문제가 발생했어요");
    }
  }

  if (!profile || memberships === null) return <CenteredSpinner />;

  // 2인 이상 대회는 먼저 팀을 구성해야 하지만, 1인 대회는 팀 없이도 바로
  // 신청할 수 있으므로 openCategories가 비어 있을 때만 막아요.
  if (openCategories.length === 0 && memberships.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-semibold">팀 구성이 필요해요</p>
        <p className="mt-1 text-sm text-muted">전시물을 등록하려면 먼저 참가할 대회의 팀을 만들거나 참가해주세요.</p>
        <Button className="mt-6" onClick={() => router.push("/team")}>
          팀 구성하러 가기
        </Button>
      </div>
    );
  }

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "온라인전시관", href: "/exhibitions" }, { label: "등록" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">전시물 등록</h1>
      <p className="mt-1 text-sm text-muted">{teamName ?? "팀"} 이름으로 등록됩니다.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        <Select label="카테고리" {...register("categoryId")} error={errors.categoryId?.message}>
          <option value="" disabled>
            카테고리를 선택하세요
          </option>
          {openCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({formatDateRange(c.submissionOpenAt, c.submissionCloseAt)})
            </option>
          ))}
        </Select>
        {openCategories.length === 0 && (
          <p className="text-xs text-muted">
            신청 가능한 대회가 없어요. 2인 이상 대회는 참가하려는 대회의 팀을 먼저 구성해주세요.
          </p>
        )}

        {missingTeamCategories.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">아직 팀을 구성하지 않은 진행 중인 대회가 있어요</p>
            <ul className="list-inside list-disc">
              {missingTeamCategories.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
            <Link href="/team" className="self-start font-semibold underline underline-offset-2">
              팀 구성하러 가기
            </Link>
          </div>
        )}

        <Input label="제목" placeholder="프로젝트 제목" {...register("title")} error={errors.title?.message} />
        <Textarea
          label="한줄 소개"
          placeholder="프로젝트를 한 줄로 소개해주세요"
          {...register("oneLiner")}
          error={errors.oneLiner?.message}
        />
        <Input
          label="프로젝트 링크 (선택)"
          placeholder="https://your-project.com"
          {...register("projectUrl")}
          error={errors.projectUrl?.message}
        />
        {projectUrl && <LiveLinkPreview url={projectUrl} />}
        <LinkPreviewHelp />
        <DeployHelp />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">대표 이미지 (선택)</span>
          <div className="flex items-center gap-3">
            {thumbnailPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailPreviewUrl}
                alt="대표 이미지 미리보기"
                className="aspect-[4/3] h-24 w-auto rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] h-24 items-center justify-center rounded-lg border border-dashed border-border bg-surface text-xs text-muted">
                미리보기
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1.5">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailFileChange} />
              <span className="text-xs text-muted">JPG, PNG, WebP (최대 5MB) · 권장 규격 1200×900px (4:3 가로형)</span>
              <span className="text-xs text-muted">
                온라인전시관 카드에 이 비율로 잘려서 노출돼요. 등록하지 않으면 PDF 첫 페이지가 대신 사용돼요.
              </span>
            </div>
          </div>
          {thumbnailError && <span className="text-xs font-medium text-red-600">{thumbnailError}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">발표자료 PDF (선택)</span>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-8 text-center transition hover:border-primary">
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
            {file ? (
              <span className="flex items-center gap-2 font-medium text-foreground">
                <FileText size={18} /> {file.name}
              </span>
            ) : (
              <>
                <UploadCloud size={24} className="text-muted" />
                <span className="text-sm text-muted">PDF 파일을 선택하세요 (최대 50MB, {MAX_PDF_PAGES}페이지)</span>
              </>
            )}
          </label>
          {fileError && <span className="text-xs font-medium text-red-600">{fileError}</span>}
          <PresentationHelp />
        </div>

        {progress && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{progress.label}</span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, progress.percent)}%` }}
              />
            </div>
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" size="lg" loading={busy} disabled={openCategories.length === 0}>
          {busy ? "등록 중..." : "전시물 등록하기"}
        </Button>
      </form>
    </div>
  );
}
