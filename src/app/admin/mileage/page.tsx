"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { listAllMileageGrants } from "@/lib/firestore/mileage";
import { recentSemesters, semesterLabel } from "@/lib/utils/semester";
import type { MileageGrant } from "@/types/models";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { CenteredSpinner } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";

interface StudentAggregate {
  uid: string;
  studentName: string;
  studentIdNumber: string;
  total: number;
  grants: MileageGrant[];
}

export default function AdminMileagePage() {
  const [grants, setGrants] = useState<MileageGrant[] | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listAllMileageGrants().then(setGrants);
  }, []);

  const semesterOptions = useMemo(() => {
    if (!grants) return recentSemesters(8);
    const present = new Set(grants.map((g) => g.semester));
    recentSemesters(8).forEach((s) => present.add(s));
    return Array.from(present).sort().reverse();
  }, [grants]);

  const scopedGrants = useMemo(() => {
    if (!grants) return [];
    return semesterFilter === "all" ? grants : grants.filter((g) => g.semester === semesterFilter);
  }, [grants, semesterFilter]);

  const students = useMemo<StudentAggregate[]>(() => {
    const byUid = new Map<string, StudentAggregate>();
    for (const g of scopedGrants) {
      const existing = byUid.get(g.uid);
      if (existing) {
        existing.total += g.amount;
        existing.grants.push(g);
      } else {
        byUid.set(g.uid, { uid: g.uid, studentName: g.studentName, studentIdNumber: g.studentIdNumber, total: g.amount, grants: [g] });
      }
    }
    return Array.from(byUid.values()).sort((a, b) => b.total - a.total);
  }, [scopedGrants]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.studentName.toLowerCase().includes(q) || s.studentIdNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  function handleExport() {
    const scopeLabel = semesterFilter === "all" ? "전체" : semesterLabel(semesterFilter);
    const rows = filteredStudents.map((s) => ({
      이름: s.studentName,
      학번: s.studentIdNumber,
      "마일리지 총점": s.total,
      획득내역: s.grants
        .map((g) => `[${semesterLabel(g.semester)}] ${g.title} (${g.amount >= 0 ? "+" : ""}${g.amount})`)
        .join("\n"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, scopeLabel);
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `마일리지_내역_${scopeLabel}_${today}.xlsx`);
  }

  if (grants === null) return <CenteredSpinner />;

  return (
    <div>
      <AdminPageHeader
        title="마일리지 관리"
        description="학생별 마일리지 획득 내역을 학기별로 확인하고 엑셀로 출력할 수 있어요."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredStudents.length === 0}>
            <Download size={14} /> 엑셀로 출력
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input label="검색" placeholder="이름 또는 학번/사번으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select label="학기" value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
            <option value="all">전체 학기</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                {semesterLabel(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">총 {filteredStudents.length}명</p>

      {filteredStudents.length === 0 ? (
        <p className="mt-6 py-10 text-center text-sm text-muted">마일리지 내역이 있는 학생이 없어요.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {filteredStudents.map((s) => (
            <li key={s.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
              <div>
                <p className="font-bold">{s.studentName}</p>
                <p className="text-sm text-muted">
                  {s.studentIdNumber || "-"} · 획득 {s.grants.length}건
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-lg font-extrabold text-primary">{s.total}점</span>
                <Link href={`/admin/users/${s.uid}`}>
                  <Button variant="outline" size="sm">
                    <Eye size={14} /> 상세
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
