"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/firestore/users";
import { getTeam, listMembershipsForUser } from "@/lib/firestore/teams";
import { getCategory } from "@/lib/firestore/categories";
import {
  createMileageGrant,
  deleteMileageGrant,
  listMileageGrantsForUser,
  type MileageGrantInput,
} from "@/lib/firestore/mileage";
import { currentSemester, recentSemesters, semesterLabel } from "@/lib/utils/semester";
import type { Category, MileageGrant, Team, TeamMembership, UserProfile } from "@/types/models";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { Badge, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

interface ContestRow {
  membership: TeamMembership;
  team: Team | null;
  category: Category | null;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ uid: string }>();
  const { profile: adminProfile } = useAuth();

  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [contests, setContests] = useState<ContestRow[] | null>(null);
  const [grants, setGrants] = useState<MileageGrant[] | null>(null);

  useEffect(() => {
    getUserProfile(params.uid).then(setUser);
  }, [params.uid]);

  useEffect(() => {
    listMembershipsForUser(params.uid).then(async (memberships) => {
      const rows = await Promise.all(
        memberships.map(async (m) => {
          const team = await getTeam(m.teamId);
          const category = await getCategory(m.categoryId);
          return { membership: m, team, category };
        })
      );
      setContests(rows);
    });
  }, [params.uid]);

  const refreshGrants = useCallback(async () => {
    setGrants(await listMileageGrantsForUser(params.uid));
  }, [params.uid]);

  useEffect(() => {
    refreshGrants();
  }, [refreshGrants]);

  if (user === undefined || contests === null || grants === null) return <CenteredSpinner />;
  if (user === null) {
    return (
      <div className="max-w-3xl">
        <p className="py-20 text-center text-sm text-muted">사용자를 찾을 수 없어요.</p>
      </div>
    );
  }

  const total = grants.reduce((sum, g) => sum + g.amount, 0);
  const grantedCategoryIds = new Set(grants.filter((g) => g.source === "contest").map((g) => g.categoryId));

  async function handleDelete(id: string) {
    if (!confirm("이 마일리지 내역을 삭제할까요?")) return;
    await deleteMileageGrant(id);
    await refreshGrants();
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> 사용자 목록
      </Link>
      <AdminPageHeader title={`${user.name}님 상세정보`} description={`총 마일리지 ${total}점`} />

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-bold">기본 정보</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <InfoItem label="구분" value={user.memberType === "staff" ? "교직원" : "학생"} />
          <InfoItem label={user.memberType === "staff" ? "사번" : "학번"} value={user.studentId || "-"} />
          <InfoItem label="이메일" value={user.email} />
          <InfoItem label="학교" value={user.school} />
          <InfoItem label={user.memberType === "staff" ? "소속" : "학과"} value={user.department || "-"} />
          {user.memberType === "student" && <InfoItem label="학년" value={user.grade || "-"} />}
          <InfoItem label="전화번호" value={user.phone} />
          <InfoItem label="역할" value={user.role === "admin" ? "관리자" : user.role === "judge" ? "심사위원" : "일반"} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-bold">참여한 대회</h2>
        {contests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">참여한 대회가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {contests.map((row) => (
              <ContestGrantRow
                key={row.membership.categoryId}
                row={row}
                granted={grantedCategoryIds.has(row.membership.categoryId)}
                user={user}
                adminUid={adminProfile?.uid ?? ""}
                adminName={adminProfile?.name ?? ""}
                onGranted={refreshGrants}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-bold">마일리지 부여</h2>
        <ManualGrantForm
          user={user}
          adminUid={adminProfile?.uid ?? ""}
          adminName={adminProfile?.name ?? ""}
          onGranted={refreshGrants}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-bold">마일리지 내역</h2>
        {grants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 부여된 마일리지가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {grants.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{g.title}</span>
                    <Badge>{semesterLabel(g.semester)}</Badge>
                    {g.categoryName && <span className="text-xs text-muted">{g.categoryName}</span>}
                  </div>
                  {g.content && <p className="mt-1 text-xs text-muted">{g.content}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={cn("font-bold", g.amount < 0 ? "text-red-600" : "text-primary")}>
                    {g.amount >= 0 ? "+" : ""}
                    {g.amount}
                  </span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    aria-label="삭제"
                    className="text-muted transition hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function contestDisplayName(row: ContestRow): string {
  return row.category?.name ?? row.team?.categoryName ?? row.membership.categoryId;
}

function ContestGrantRow({
  row,
  granted,
  user,
  adminUid,
  adminName,
  onGranted,
}: {
  row: ContestRow;
  granted: boolean;
  user: UserProfile;
  adminUid: string;
  adminName: string;
  onGranted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(row.category?.baseMileage ?? 0);
  const [title, setTitle] = useState(`${contestDisplayName(row)} 참여 마일리지`);
  const [content, setContent] = useState("");
  const [semester, setSemester] = useState(currentSemester());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGrant() {
    setSubmitting(true);
    setError(null);
    try {
      const input: MileageGrantInput = {
        uid: user.uid,
        studentName: user.name,
        studentIdNumber: user.studentId,
        amount,
        title,
        content,
        semester,
        source: "contest",
        categoryId: row.membership.categoryId,
        categoryName: contestDisplayName(row),
        grantedBy: adminUid,
        grantedByName: adminName,
      };
      await createMileageGrant(input);
      setOpen(false);
      onGranted();
    } catch {
      setError("마일리지 부여에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{contestDisplayName(row)}</p>
          <p className="text-xs text-muted">
            {row.team?.name ?? "-"} · 기본 마일리지 {row.category?.baseMileage ?? 0}점
          </p>
        </div>
        {granted ? (
          <Badge className="gap-1">
            <Check size={12} /> 승인됨
          </Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            <Award size={14} /> 마일리지 부여
          </Button>
        )}
      </div>

      {open && !granted && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="부여 사유를 입력해주세요" />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="마일리지"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <Select label="학기" value={semester} onChange={(e) => setSemester(e.target.value)}>
              {recentSemesters(8).map((s) => (
                <option key={s} value={s}>
                  {semesterLabel(s)}
                </option>
              ))}
            </Select>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button size="sm" loading={submitting} onClick={handleGrant} className="self-start">
            확인
          </Button>
        </div>
      )}
    </li>
  );
}

function ManualGrantForm({
  user,
  adminUid,
  adminName,
  onGranted,
}: {
  user: UserProfile;
  adminUid: string;
  adminName: string;
  onGranted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState(0);
  const [semester, setSemester] = useState(currentSemester());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const input: MileageGrantInput = {
        uid: user.uid,
        studentName: user.name,
        studentIdNumber: user.studentId,
        amount,
        title,
        content,
        semester,
        source: "manual",
        categoryId: null,
        categoryName: null,
        grantedBy: adminUid,
        grantedByName: adminName,
      };
      await createMileageGrant(input);
      setTitle("");
      setContent("");
      setAmount(0);
      setSuccess(true);
      onGranted();
    } catch {
      setError("마일리지 부여에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 특별활동 참여" />
      <Textarea label="내용" value={content} onChange={(e) => setContent(e.target.value)} placeholder="부여 사유를 입력해주세요" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="마일리지" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <Select label="학기" value={semester} onChange={(e) => setSemester(e.target.value)}>
          {recentSemesters(8).map((s) => (
            <option key={s} value={s}>
              {semesterLabel(s)}
            </option>
          ))}
        </Select>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {success && <p className="text-sm font-medium text-primary-dark">마일리지가 부여됐어요.</p>}
      <Button loading={submitting} onClick={handleSubmit} className="self-start">
        부여하기
      </Button>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
