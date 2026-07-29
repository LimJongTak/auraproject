"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EyeOff, Eye } from "lucide-react";
import { listAllExhibitionsForAdmin, setExhibitionStatus } from "@/lib/firestore/exhibitions";
import type { Exhibition, ExhibitionStatus } from "@/types/models";
import { Badge, CenteredSpinner } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  draft: "임시저장",
  published: "게시중",
  hidden: "숨김",
};

export default function AdminExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);

  async function refresh() {
    setExhibitions(await listAllExhibitionsForAdmin());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(exhibition: Exhibition) {
    const next: ExhibitionStatus = exhibition.status === "hidden" ? "published" : "hidden";
    await setExhibitionStatus(exhibition.id, next);
    refresh();
  }

  if (!exhibitions) return <CenteredSpinner />;

  return (
    <div>
      <AdminPageHeader title="게시물 관리" />

      <ul className="flex flex-col gap-3">
        {exhibitions.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge>{e.categoryName}</Badge>
                <span className="text-xs font-semibold text-muted">{STATUS_LABEL[e.status]}</span>
              </div>
              <Link href={`/exhibitions/${e.id}`} className="mt-1 block truncate font-bold hover:text-primary">
                {e.title}
              </Link>
              <p className="text-sm text-muted">{e.teamName}</p>
            </div>
            {e.status !== "draft" && (
              <Button variant="outline" size="sm" onClick={() => toggle(e)} className="shrink-0">
                {e.status === "hidden" ? (
                  <>
                    <Eye size={14} /> 공개
                  </>
                ) : (
                  <>
                    <EyeOff size={14} /> 숨김
                  </>
                )}
              </Button>
            )}
          </li>
        ))}
        {exhibitions.length === 0 && <p className="py-10 text-center text-sm text-muted">등록된 전시물이 없어요.</p>}
      </ul>
    </div>
  );
}
