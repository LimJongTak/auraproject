"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeMyMileageGrants } from "@/lib/firestore/mileage";
import { semesterLabel } from "@/lib/utils/semester";
import type { MileageGrant } from "@/types/models";
import { Badge, CenteredSpinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

export default function MyMileagePage() {
  const { profile } = useAuth();
  const [grants, setGrants] = useState<MileageGrant[] | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMileageGrants(profile.uid, setGrants);
    return () => unsub();
  }, [profile?.uid]);

  const semesterOptions = useMemo(() => {
    if (!grants) return [];
    return Array.from(new Set(grants.map((g) => g.semester))).sort().reverse();
  }, [grants]);

  const filteredGrants = useMemo(() => {
    if (!grants) return [];
    return semesterFilter === "all" ? grants : grants.filter((g) => g.semester === semesterFilter);
  }, [grants, semesterFilter]);

  const total = filteredGrants.reduce((sum, g) => sum + g.amount, 0);

  if (!profile) return <CenteredSpinner />;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <Coins className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">마일리지</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{semesterFilter === "all" ? "전체 누적" : semesterLabel(semesterFilter)}</p>
            <p className="mt-1 text-3xl font-extrabold text-primary">{total}점</p>
          </div>
          {semesterOptions.length > 0 && (
            <div className="w-40">
              <Select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
                <option value="all">전체 학기</option>
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>
                    {semesterLabel(s)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-bold">획득 내역</h2>
        {grants === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : filteredGrants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 획득한 마일리지가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {filteredGrants.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{g.title}</span>
                    <Badge>{semesterLabel(g.semester)}</Badge>
                    {g.categoryName && <span className="text-xs text-muted">{g.categoryName}</span>}
                  </div>
                  {g.content && <p className="mt-1 text-xs text-muted">{g.content}</p>}
                </div>
                <span className={cn("shrink-0 font-bold", g.amount < 0 ? "text-red-600" : "text-primary")}>
                  {g.amount >= 0 ? "+" : ""}
                  {g.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
