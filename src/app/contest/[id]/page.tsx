"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategory } from "@/lib/firestore/categories";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import { useCountdownTimer } from "@/hooks/useCountdown";
import type { Category } from "@/types/models";
import { Breadcrumb, CenteredSpinner, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils/cn";

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  before: { label: "접수 예정", className: "bg-blue-50 text-blue-600" },
  open: { label: "접수 중", className: "bg-green-50 text-green-600" },
  closed: { label: "접수 마감", className: "bg-surface text-muted" },
};

function formatTeamSize(min: number | undefined, max: number | null | undefined): string {
  const lo = min ?? 1;
  if (max != null && max === lo) return `${lo}명`;
  return max != null ? `${lo}~${max}명` : `${lo}명 이상`;
}

export default function ContestDetailPage() {
  const params = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null | undefined>(undefined);

  useEffect(() => {
    getCategory(params.id).then(setCategory);
  }, [params.id]);

  const state = category ? getSubmissionWindowState(category.submissionOpenAt, category.submissionCloseAt) : null;
  const countdownTarget = state === "open" && category ? category.submissionCloseAt.toDate() : null;
  const countdown = useCountdownTimer(countdownTarget);

  if (category === undefined) return <CenteredSpinner />;
  if (category === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="대회를 찾을 수 없어요" description="삭제되었거나 존재하지 않는 대회예요." />
      </div>
    );
  }

  const windowState = state!;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "대회", href: "/contest" }, { label: category.name }]} />

      {category.bannerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.bannerImageUrl}
          alt={category.name}
          className="mt-4 h-56 w-full rounded-2xl object-cover sm:h-72"
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-extrabold">{category.name}</h1>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATE_LABEL[windowState].className)}>
          {STATE_LABEL[windowState].label}
        </span>
      </div>
      {windowState === "open" && countdown && !countdown.done && (
        <p className="mt-2 text-sm font-semibold text-primary">
          마감까지 {countdown.days}일 {String(countdown.hours).padStart(2, "0")}:
          {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
        </p>
      )}
      {category.description && <p className="mt-2 text-foreground/80">{category.description}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">접수 기간</p>
          <p className="mt-0.5 font-medium">{formatDateRange(category.submissionOpenAt, category.submissionCloseAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">팀 인원</p>
          <p className="mt-0.5 font-medium">{formatTeamSize(category.teamSizeMin, category.teamSizeMax)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">기본 지급 마일리지</p>
          <p className="mt-0.5 font-medium">{category.baseMileage ?? 0}점</p>
        </div>
      </div>

      {category.detailContent && (
        <RichText
          content={category.detailContent}
          className="mt-8 whitespace-pre-wrap leading-relaxed text-foreground/90"
        />
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        {windowState === "open" ? (
          <Link href={`/exhibitions/new?categoryId=${category.id}`} className="flex-1">
            <Button className="w-full">신청하기</Button>
          </Link>
        ) : (
          <Button className="flex-1" disabled>
            {STATE_LABEL[windowState].label}
          </Button>
        )}
        <Link href="/exhibitions" className="flex-1">
          <Button variant="outline" className="w-full">
            전시물 보러가기 <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
