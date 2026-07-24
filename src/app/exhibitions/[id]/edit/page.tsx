"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/Guard";
import { getExhibition, updateExhibitionMeta } from "@/lib/firestore/exhibitions";
import { getMembership } from "@/lib/firestore/teams";
import { exhibitionMetaSchema, type ExhibitionMetaValues } from "@/lib/validation/exhibitionSchema";
import type { Exhibition } from "@/types/models";
import type { LinkPreviewApiResponse } from "@/lib/linkPreview/types";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge, Breadcrumb, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { LiveLinkPreview } from "@/components/link-preview/LiveLinkPreview";
import { LinkPreviewHelp } from "@/components/link-preview/LinkPreviewHelp";

export default function EditExhibitionPage() {
  return (
    <RequireAuth>
      <EditExhibitionForm />
    </RequireAuth>
  );
}

function EditExhibitionForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null | undefined>(undefined);
  const [canEdit, setCanEdit] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExhibitionMetaValues>({ resolver: zodResolver(exhibitionMetaSchema) });
  const projectUrl = watch("projectUrl") ?? "";

  useEffect(() => {
    getExhibition(params.id).then((data) => {
      setExhibition(data);
      if (data) {
        reset({
          categoryId: data.categoryId,
          title: data.title,
          oneLiner: data.oneLiner,
          projectUrl: data.projectUrl ?? "",
        });
      }
    });
  }, [params.id, reset]);

  useEffect(() => {
    if (!profile || !exhibition) return;
    if (profile.role === "admin") {
      setCanEdit(true);
      return;
    }
    getMembership(profile.uid, exhibition.categoryId).then((m) => {
      setCanEdit(!!m && m.teamId === exhibition.teamId);
    });
  }, [profile, exhibition]);

  if (exhibition === undefined || !profile || canEdit === undefined) return <CenteredSpinner />;
  if (exhibition === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-muted">전시물을 찾을 수 없어요.</div>
    );
  }
  if (!canEdit) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-muted">수정 권한이 없어요.</div>;
  }

  async function onSubmit(values: ExhibitionMetaValues) {
    if (!exhibition) return;
    setError(null);
    try {
      let linkPreview = exhibition.linkPreview;
      if (values.projectUrl !== (exhibition.projectUrl ?? "")) {
        linkPreview = null;
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
            // keep going without a preview
          }
        }
      }

      await updateExhibitionMeta(exhibition.id, {
        title: values.title,
        oneLiner: values.oneLiner,
        categoryId: exhibition.categoryId,
        categoryName: exhibition.categoryName,
        projectUrl: values.projectUrl || null,
        linkPreview,
      });
      router.push(`/exhibitions/${exhibition.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 중 문제가 발생했어요");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[{ label: "홈", href: "/" }, { label: "온라인전시관", href: "/exhibitions" }, { label: "수정" }]}
      />
      <h1 className="mt-4 text-2xl font-extrabold">전시물 수정</h1>
      <p className="mt-1 text-sm text-muted">PDF 자료는 수정할 수 없어요. 새로 등록해주세요.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        <input type="hidden" {...register("categoryId")} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">카테고리</span>
          <div>
            <Badge>{exhibition.categoryName}</Badge>
          </div>
          <span className="text-xs text-muted">전시물의 카테고리는 팀이 참가한 대회로 고정되어 바꿀 수 없어요.</span>
        </div>
        <Input label="제목" {...register("title")} error={errors.title?.message} />
        <Textarea label="한줄 소개" {...register("oneLiner")} error={errors.oneLiner?.message} />
        <Input label="프로젝트 링크 (선택)" {...register("projectUrl")} error={errors.projectUrl?.message} />
        {projectUrl && <LiveLinkPreview url={projectUrl} />}
        <LinkPreviewHelp />

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" size="lg" loading={isSubmitting}>
          수정 완료
        </Button>
      </form>
    </div>
  );
}
