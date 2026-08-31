"use client";

import { useEffect, useState } from "react";
import { Archive, Download } from "lucide-react";
import { subscribeCategories } from "@/lib/firestore/categories";
import { listAllExhibitionsForAdmin } from "@/lib/firestore/exhibitions";
import { listAllTeamsForAdmin } from "@/lib/firestore/teams";
import { listAllUsers } from "@/lib/firestore/users";
import type { Category, Exhibition, MemberType, Team, UserProfile } from "@/types/models";
import { toCsv, downloadCsv } from "@/lib/utils/csv";
import { buildContestZip, type ExportProgress } from "@/lib/admin/exportContestZip";
import { CenteredSpinner } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";

interface Applicant {
  uid: string;
  name: string;
  memberType: MemberType;
  department: string;
  grade: string;
  studentId: string;
  teamName: string;
}

export default function AdminApplicantsPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [zipProgress, setZipProgress] = useState<Record<string, ExportProgress | "done" | "error">>({});

  useEffect(() => {
    const unsub = subscribeCategories(setCategories);
    return () => unsub();
  }, []);

  useEffect(() => {
    Promise.all([listAllExhibitionsForAdmin(), listAllTeamsForAdmin(), listAllUsers()]).then(
      ([ex, tm, us]) => {
        setExhibitions(ex);
        setTeams(tm);
        setUsers(us);
      }
    );
  }, []);

  if (categories === null || exhibitions === null || teams === null || users === null) {
    return <CenteredSpinner />;
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const userById = new Map(users.map((u) => [u.uid, u]));

  // A team only counts as having participated once one of its exhibitions is
  // actually live — a draft (submission never finished, e.g. an abandoned
  // attempt like getDraftExhibitionForTeam resumes into) or a hidden one
  // (pulled from public view) doesn't. A team can have more than one
  // exhibition doc for the same contest, so this is "published" wins if any
  // of them are, not any single doc's status.
  function publishedTeamIdsFor(categoryId: string): Set<string> {
    const teamIds = new Set<string>();
    for (const ex of exhibitions!) {
      if (ex.categoryId === categoryId && ex.status === "published") teamIds.add(ex.teamId);
    }
    return teamIds;
  }

  function applicantsFor(categoryId: string): Applicant[] {
    const seen = new Set<string>();
    const list: Applicant[] = [];
    for (const teamId of publishedTeamIdsFor(categoryId)) {
      const team = teamById.get(teamId);
      if (!team) continue;
      for (const uid of team.memberUids) {
        if (seen.has(uid)) continue;
        seen.add(uid);
        const u = userById.get(uid);
        if (!u) continue;
        list.push({
          uid,
          name: u.name,
          memberType: u.memberType ?? "student",
          department: u.department || "-",
          grade: u.grade || "-",
          studentId: u.studentId || "-",
          teamName: team.name,
        });
      }
    }
    return list;
  }

  function handleDownload(category: Category, applicants: Applicant[]) {
    const csv = toCsv(
      ["이름", "구분", "학과/소속", "학년", "학번/사번", "팀명"],
      applicants.map((a) => [
        a.name,
        a.memberType === "staff" ? "교직원" : "학생",
        a.department,
        a.grade,
        a.studentId,
        a.teamName,
      ])
    );
    downloadCsv(`${category.name}_신청자명단.csv`, csv);
  }

  async function handleDownloadZip(category: Category) {
    const categoryExhibitions = exhibitions!.filter((e) => e.categoryId === category.id);
    setZipProgress((prev) => ({ ...prev, [category.id]: { current: 0, total: 0, title: "" } }));
    try {
      const blob = await buildContestZip(category, categoryExhibitions, (progress) =>
        setZipProgress((prev) => ({ ...prev, [category.id]: progress }))
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${category.name}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setZipProgress((prev) => ({ ...prev, [category.id]: "done" }));
    } catch {
      setZipProgress((prev) => ({ ...prev, [category.id]: "error" }));
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="신청자 관리"
        description="대회(카테고리)별로 게시까지 완료한 학생 명단을 확인하고 CSV로 내려받을 수 있어요. 임시저장 상태인 전시물은 참여로 집계되지 않아요."
      />

      <div className="flex flex-col gap-6">
        {categories.map((c) => {
          const applicants = applicantsFor(c.id);
          const publishedCount = exhibitions.filter((e) => e.categoryId === c.id && e.status === "published").length;
          const progress = zipProgress[c.id];
          const zipping = progress != null && progress !== "done" && progress !== "error";
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted">신청자 {applicants.length}명 · 게시된 작품 {publishedCount}개</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(c, applicants)}
                    disabled={applicants.length === 0}
                  >
                    <Download size={14} /> CSV 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={zipping}
                    onClick={() => handleDownloadZip(c)}
                    disabled={publishedCount === 0 || zipping}
                  >
                    <Archive size={14} /> 작품 ZIP 다운로드
                  </Button>
                </div>
              </div>
              {progress && progress !== "done" && progress !== "error" && (
                <p className="mt-2 text-xs text-muted">
                  {progress.total === 0
                    ? "준비 중..."
                    : `작품 압축 중 (${progress.current}/${progress.total}) — ${progress.title}`}
                </p>
              )}
              {progress === "error" && <p className="mt-2 text-xs font-medium text-red-600">ZIP 생성에 실패했어요</p>}

              {applicants.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-4 font-semibold">이름</th>
                        <th className="py-2 pr-4 font-semibold">구분</th>
                        <th className="py-2 pr-4 font-semibold">학과/소속</th>
                        <th className="py-2 pr-4 font-semibold">학년</th>
                        <th className="py-2 pr-4 font-semibold">학번/사번</th>
                        <th className="py-2 pr-4 font-semibold">팀명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.map((a) => (
                        <tr key={a.uid} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4">{a.name}</td>
                          <td className="py-2 pr-4">{a.memberType === "staff" ? "교직원" : "학생"}</td>
                          <td className="py-2 pr-4">{a.department}</td>
                          <td className="py-2 pr-4">{a.grade}</td>
                          <td className="py-2 pr-4">{a.studentId}</td>
                          <td className="py-2 pr-4">{a.teamName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {categories.length === 0 && <p className="py-10 text-center text-sm text-muted">등록된 대회가 없어요.</p>}
      </div>
    </div>
  );
}
