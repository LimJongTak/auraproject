"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Pencil, KeyRound, X } from "lucide-react";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { changePassword } from "@/lib/auth/changePassword";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { changePasswordSchema, profileEditSchema, type ChangePasswordFormValues, type ProfileEditFormValues } from "@/lib/validation/authSchemas";
import { updateMyProfile } from "@/lib/firestore/users";
import type { UserProfile } from "@/types/models";
import { CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProfileFields } from "@/components/profile/ProfileFields";
import type { User as FirebaseUser } from "firebase/auth";

export default function MyPage() {
  const { firebaseUser, profile } = useAuth();
  const [openPanel, setOpenPanel] = useState<"profile" | "password" | null>(null);

  if (!profile) return <CenteredSpinner />;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <User className="text-primary" size={24} />
        <h1 className="text-2xl font-extrabold">내 정보</h1>
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
      const studentIdChanged = values.studentId !== profile.studentId;

      if (studentIdChanged) {
        const existing = await getDoc(doc(db, "studentIdIndex", values.studentId));
        if (existing.exists()) {
          setSubmitError("이미 사용 중인 학번/사번이에요");
          return;
        }
        // Create the new index entry before touching the profile doc, so a
        // lost uniqueness race leaves nothing changed instead of a stale
        // profile pointing at an index entry someone else grabbed first.
        try {
          await setDoc(doc(db, "studentIdIndex", values.studentId), { uid: profile.uid, email: profile.email });
        } catch {
          setSubmitError("이미 사용 중인 학번/사번이에요");
          return;
        }
      }

      await updateMyProfile(profile.uid, values);

      if (studentIdChanged && profile.studentId) {
        await deleteDoc(doc(db, "studentIdIndex", profile.studentId));
      }

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
