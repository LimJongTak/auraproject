"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, ShieldCheck, ShieldOff, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listAllUsers, setUserRole } from "@/lib/firestore/users";
import { adminWithdrawUser } from "@/lib/functions/adminWithdrawUser";
import { backfillStudentIdIndex } from "@/lib/functions/backfillStudentIdIndex";
import type { MemberType, UserProfile, UserRole } from "@/types/models";
import { CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";

function formatUserMeta(u: UserProfile): string {
  const parts = [u.school, u.department];
  if (u.memberType === "student") {
    if (u.grade) parts.push(u.grade);
    if (u.studentId) parts.push(u.studentId);
  } else {
    parts.push("교직원");
    if (u.studentId) parts.push(u.studentId);
  }
  parts.push(u.email);
  return parts.filter(Boolean).join(" · ");
}

export default function AdminUsersPage() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [withdrawingUid, setWithdrawingUid] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"all" | MemberType>("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  async function refresh() {
    setUsers(await listAllUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  const gradeOptions = useMemo(
    () => Array.from(new Set((users ?? []).filter((u) => u.grade).map((u) => u.grade))).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (memberTypeFilter !== "all" && u.memberType !== memberTypeFilter) return false;
      if (gradeFilter !== "all" && u.grade !== gradeFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.studentId.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    });
  }, [users, search, memberTypeFilter, gradeFilter, roleFilter]);

  const filtersActive = search.trim() !== "" || memberTypeFilter !== "all" || gradeFilter !== "all" || roleFilter !== "all";

  async function toggleRole(user: UserProfile) {
    await setUserRole(user.uid, user.role === "admin" ? "user" : "admin");
    refresh();
  }

  async function toggleJudge(user: UserProfile) {
    await setUserRole(user.uid, user.role === "judge" ? "user" : "judge");
    refresh();
  }

  async function handleWithdraw(user: UserProfile) {
    if (!confirm(`"${user.name}"님을 탈퇴시킬까요? 계정과 프로필이 삭제되며 되돌릴 수 없어요.`)) return;
    setWithdrawError(null);
    setWithdrawingUid(user.uid);
    try {
      await adminWithdrawUser(user.uid);
      await refresh();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "탈퇴 처리 중 문제가 발생했어요");
    } finally {
      setWithdrawingUid(null);
    }
  }

  async function handleBackfill() {
    setMigrating(true);
    setMigrationError(null);
    setMigrationResult(null);
    try {
      const { created, skipped } = await backfillStudentIdIndex();
      setMigrationResult(
        `${created}명 마이그레이션 완료` + (skipped.length > 0 ? ` (건너뜀 ${skipped.length}명 — 학번/사번 미입력 또는 이미 등록됨)` : "")
      );
    } catch (err) {
      setMigrationError(err instanceof Error ? err.message : "마이그레이션 중 문제가 발생했어요");
    } finally {
      setMigrating(false);
    }
  }

  if (!users) return <CenteredSpinner />;

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title="사용자 관리" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div>
          <p className="text-sm font-semibold text-amber-900">학번/사번 로그인 마이그레이션 (1회성)</p>
          <p className="mt-0.5 text-xs text-amber-700">
            기존 회원이 학번/사번으로 로그인할 수 있도록 인덱스를 채워요. 여러 번 실행해도 안전해요.
          </p>
          {migrationResult && <p className="mt-1 text-xs font-medium text-amber-900">{migrationResult}</p>}
          {migrationError && <ErrorText>{migrationError}</ErrorText>}
        </div>
        <Button variant="outline" size="sm" loading={migrating} onClick={handleBackfill}>
          마이그레이션 실행
        </Button>
      </div>

      {withdrawError && <ErrorText>{withdrawError}</ErrorText>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="검색"
            placeholder="이름, 이메일, 학번/사번, 학과로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Select label="구분" value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value as "all" | MemberType)}>
            <option value="all">전체</option>
            <option value="student">학생</option>
            <option value="staff">교직원</option>
          </Select>
        </div>
        <div className="w-28">
          <Select label="학년" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="all">전체</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select label="역할" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}>
            <option value="all">전체</option>
            <option value="user">일반</option>
            <option value="admin">관리자</option>
            <option value="judge">심사위원</option>
          </Select>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        총 {filteredUsers.length}명{filtersActive && ` (전체 ${users.length}명 중)`}
      </p>

      {filteredUsers.length === 0 && (
        <p className="mt-6 py-10 text-center text-sm text-muted">
          {filtersActive ? "조건에 맞는 사용자가 없어요." : "등록된 사용자가 없어요."}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {filteredUsers.map((user) => (
          <li key={user.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
            <div>
              <p className="font-bold">
                {user.name}
                {user.role === "admin" && (
                  <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                    관리자
                  </span>
                )}
                {user.role === "judge" && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    심사위원
                  </span>
                )}
              </p>
              <p className="text-sm text-muted">{formatUserMeta(user)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={user.uid === firebaseUser?.uid}
                onClick={() => toggleRole(user)}
              >
                {user.role === "admin" ? (
                  <>
                    <ShieldOff size={14} /> 권한 해제
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} /> 관리자 지정
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={user.uid === firebaseUser?.uid}
                onClick={() => toggleJudge(user)}
              >
                <ClipboardCheck size={14} /> {user.role === "judge" ? "심사위원 해제" : "심사위원 지정"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={user.uid === firebaseUser?.uid || withdrawingUid !== null}
                loading={withdrawingUid === user.uid}
                onClick={() => handleWithdraw(user)}
              >
                <UserX size={14} /> 탈퇴
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
