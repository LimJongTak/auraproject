"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { getCategory } from "@/lib/firestore/categories";
import { listPublishedExhibitions } from "@/lib/firestore/exhibitions";
import { getSubmissionWindowState, formatDateRange } from "@/lib/utils/dateWindow";
import { useCountdownTimer } from "@/hooks/useCountdown";
import type { Category, Exhibition } from "@/types/models";
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

      {category.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.thumbnailUrl}
          alt={category.name}
          className="mt-4 aspect-[2/1] w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-extrabold">{category.name}</h1>
        {category.contestType && (
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark">
            {category.contestType}
          </span>
        )}
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

      <AwardResultsSection category={category} />

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

interface AwardGroup {
  label: string;
  minRank: number;
  items: Exhibition[];
}

// Public "결과 발표" block — only rendered once an admin has turned on a
// countdown for this contest (Category.awardAnnounceAt). Winners are read
// straight off Exhibition.award, which is already set well before the
// reveal; before the target time this component only shows the countdown
// and never fetches the list, so nothing leaks through it early.
function AwardResultsSection({ category }: { category: Category }) {
  const target = category.awardAnnounceAt?.toDate() ?? null;
  const countdown = useCountdownTimer(target);
  const revealed = !target || (countdown?.done ?? false);
  const [winners, setWinners] = useState<Exhibition[] | null>(null);

  useEffect(() => {
    if (!revealed) {
      setWinners(null);
      return;
    }
    listPublishedExhibitions({ categoryId: category.id, max: 500 }).then((exs) =>
      setWinners(exs.filter((e) => e.award))
    );
  }, [revealed, category.id]);

  const groups = useMemo<AwardGroup[]>(() => {
    if (!winners) return [];
    const byLabel = new Map<string, Exhibition[]>();
    for (const w of winners) {
      const label = w.award!.label;
      const list = byLabel.get(label) ?? [];
      list.push(w);
      byLabel.set(label, list);
    }
    return Array.from(byLabel.entries())
      .map(([label, items]) => ({
        label,
        minRank: Math.min(...items.map((i) => i.award!.rank)),
        items: [...items].sort((a, b) => a.award!.rank - b.award!.rank || a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.minRank - b.minRank);
  }, [winners]);

  if (!target) return null;

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-1.5">
        <Trophy size={18} className="text-primary" />
        <h2 className="text-lg font-extrabold">수상 결과</h2>
      </div>

      {!revealed ? (
        countdown && (
          <div className="mt-4">
            <p className="text-sm text-muted">아래 시각에 수상 결과가 공개돼요.</p>
            <p className="mt-2 text-2xl font-extrabold text-primary">
              {countdown.days}일 {String(countdown.hours).padStart(2, "0")}:
              {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
            </p>
          </div>
        )
      ) : winners === null ? (
        <p className="mt-4 text-sm text-muted">불러오는 중...</p>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-sm text-muted">아직 등록된 수상작이 없어요.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                <Trophy size={14} /> {group.label}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white p-3">
                    <Link href={`/exhibitions/${item.id}`} className="font-semibold hover:text-primary">
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {category.teamSizeMax === 1 ? "신청자" : "팀"} · {item.teamName}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
