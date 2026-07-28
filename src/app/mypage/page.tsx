"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Heart, MessageCircle, Plus, ArrowRight, Trophy, Pencil, KeyRound, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/Guard";
import { listTeamExhibitions } from "@/lib/firestore/exhibitions";
import { getTeam, subscribeMyMemberships } from "@/lib/firestore/teams";
import { subscribeMyInquiries } from "@/lib/firestore/inquiries";
import { changePassword } from "@/lib/auth/changePassword";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { changePasswordSchema, profileEditSchema, type ChangePasswordFormValues, type ProfileEditFormValues } from "@/lib/validation/authSchemas";
import { updateMyProfile } from "@/lib/firestore/users";
import type { Exhibition, ExhibitionStatus, Inquiry, Team, TeamMembership, UserProfile } from "@/types/models";
import { Badge, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProfileFields } from "@/components/profile/ProfileFields";
import type { User as FirebaseUser } from "firebase/auth";
import { cn } from "@/lib/utils/cn";

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  draft: "임시저장",
  published: "게시중",
  hidden: "숨김",
};

const INQUIRY_STATUS_LABEL: Record<Inquiry["status"], { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-surface text-muted" },
  answered: { label: "답변완료", className: "bg-primary-light text-primary-dark" },
};

export default function MyPage() {
  return (
    <RequireAuth>
      <MyPageContent />
    </RequireAuth>
  );
}

function MyPageContent() {
  const { firebaseUser, profile } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[] | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [openPanel, setOpenPanel] = useState<"profile" | "password" | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyMemberships(profile.uid, setMemberships);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeMyInquiries(profile.uid, setInquiries);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length === 0) {
      setTeams([]);
      setExhibitions([]);
      return;
    }
    Promise.all(memberships.map((m) => getTeam(m.teamId))).then((ts) =>
      setTeams(ts.filter((t): t is Team => !!t))
    );
    Promise.all(memberships.map((m) => listTeamExhibitions(m.teamId))).then((lists) =>
      setExhibitions(lists.flat().sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()))
    );
  }, [memberships]);

  if (!profile) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex items-center gap-2">
        <User className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">마이페이지</h1>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{profile.name}</p>
            <p className="mt-1 text-sm text-muted">{profile.email}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenPanel((cur) => (cur === "profile" ? null : "profile"))}
            >
              {openPanel === "profile" ? <X size={14} /> : <Pencil size={14} />}
              {openPanel === "profile" ? "닫기" : "정보 수정"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenPanel((cur) => (cur === "password" ? null : "password"))}
            >
              {openPanel === "password" ? <X size={14} /> : <KeyRound size={14} />}
              {openPanel === "password" ? "닫기" : "비밀번호 변경"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <InfoItem label="구분" value={profile.memberType === "staff" ? "교직원" : "학생"} />
          <InfoItem label="학교" value={profile.school} />
          <InfoItem label={profile.memberType === "staff" ? "소속" : "학과"} value={profile.department || "-"} />
          {profile.memberType === "student" && <InfoItem label="학년" value={profile.grade || "-"} />}
          <InfoItem label={profile.memberType === "staff" ? "사번" : "학번"} value={profile.studentId || "-"} />
        </div>

        {openPanel === "profile" && (
          <div className="mt-6 border-t border-border pt-6">
            <ProfileEditFields profile={profile} />
          </div>
        )}
        {openPanel === "password" && firebaseUser && (
          <div className="mt-6 border-t border-border pt-6">
            <PasswordChangeFields firebaseUser={firebaseUser} />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">내 팀</h2>
          <Link href="/team" className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Plus size={14} /> 팀 구성하러 가기
          </Link>
        </div>
        {teams === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 소속된 팀이 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-sm">
                <span className="font-medium">{t.name}</span>
                <Badge>{t.categoryName}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">내 게시글</h2>
          <Link href="/exhibitions/new" className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Plus size={14} /> 등록
          </Link>
        </div>
        {exhibitions === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : exhibitions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 등록한 전시물이 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {exhibitions.map((e) => (
              <li key={e.id} className="rounded-xl bg-surface px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/exhibitions/${e.id}`} className="truncate font-medium hover:text-primary">
                    {e.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{e.categoryName}</Badge>
                    <span className="text-xs text-muted">{STATUS_LABEL[e.status]}</span>
                    {e.award && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Trophy size={12} /> {e.award.label}
                      </span>
                    )}
                  </div>
                </div>
                {e.status === "published" && (
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {e.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {e.commentCount}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">내 문의</h2>
          <Link href="/inquiries" className="flex items-center gap-1 text-sm font-semibold text-primary">
            문의하러 가기 <ArrowRight size={14} />
          </Link>
        </div>
        {inquiries === null ? (
          <p className="mt-3 text-sm text-muted">불러오는 중...</p>
        ) : inquiries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 남긴 문의가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {inquiries.slice(0, 3).map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm">
                <span className="truncate font-medium">{q.title}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    INQUIRY_STATUS_LABEL[q.status].className
                  )}
                >
                  {INQUIRY_STATUS_LABEL[q.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfileEditFields({ profile }: { profile: UserProfile }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      memberType: profile.memberType,
      school: profile.school,
      department: profile.department,
      grade: profile.grade,
      studentId: profile.studentId,
    },
  });
  const profileValues = watch(["memberType", "school", "department", "grade", "studentId"]);

  async function onSubmit(values: ProfileEditFormValues) {
    setSubmitError(null);
    setSuccess(false);
    try {
      await updateMyProfile(profile.uid, values);
      setSuccess(true);
    } catch {
      setSubmitError("저장에 실패했어요");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <ProfileFields
        values={{
          memberType: profileValues[0],
          school: profileValues[1],
          department: profileValues[2],
          grade: profileValues[3],
          studentId: profileValues[4],
        }}
        onChange={(key, value) => setValue(key, value as never, { shouldValidate: true })}
        errors={{
          school: errors.school?.message,
          department: errors.department?.message,
          grade: errors.grade?.message,
          studentId: errors.studentId?.message,
        }}
      />

      {submitError && <ErrorText>{submitError}</ErrorText>}
      {success && (
        <p className="rounded-xl bg-primary-light px-4 py-3 text-sm font-medium text-primary-dark">
          회원정보가 저장됐어요.
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="self-start">
        저장
      </Button>
    </form>
  );
}

function PasswordChangeFields({ firebaseUser }: { firebaseUser: FirebaseUser }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordFormValues) {
    setSubmitError(null);
    setSuccess(false);
    try {
      await changePassword(firebaseUser, values.currentPassword, values.newPassword);
      reset();
      setSuccess(true);
    } catch (error) {
      setSubmitError(toKoreanAuthError(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="현재 비밀번호"
        type="password"
        {...register("currentPassword")}
        error={errors.currentPassword?.message}
      />
      <Input
        label="새 비밀번호"
        type="password"
        {...register("newPassword")}
        error={errors.newPassword?.message}
      />
      <Input
        label="새 비밀번호 확인"
        type="password"
        {...register("newPasswordConfirm")}
        error={errors.newPasswordConfirm?.message}
      />

      {submitError && <ErrorText>{submitError}</ErrorText>}
      {success && (
        <p className="rounded-xl bg-primary-light px-4 py-3 text-sm font-medium text-primary-dark">
          비밀번호가 변경됐어요.
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="self-start">
        비밀번호 변경
      </Button>
    </form>
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
