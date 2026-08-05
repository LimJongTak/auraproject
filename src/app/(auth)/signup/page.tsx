"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { SCHOOL_OPTIONS, signupSchema, type SignupFormValues } from "@/lib/validation/authSchemas";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";
import { ProfileFields } from "@/components/profile/ProfileFields";

export default function SignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      memberType: "student",
      school: SCHOOL_OPTIONS[0],
      department: "",
      grade: "",
      studentId: "",
    },
  });
  const profileValues = watch(["memberType", "school", "department", "grade", "studentId"]);

  async function onSubmit(values: SignupFormValues) {
    setSubmitError(null);
    try {
      const existing = await getDoc(doc(db, "studentIdIndex", values.studentId));
      if (existing.exists()) {
        setSubmitError("이미 사용 중인 학번/사번이에요");
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(credential.user, { displayName: values.name });
      await setDoc(doc(db, "users", credential.user.uid), {
        name: values.name,
        phone: values.phone,
        memberType: values.memberType,
        school: values.school,
        department: values.department,
        grade: values.grade,
        studentId: values.studentId,
        email: values.email,
        role: "user",
        createdAt: serverTimestamp(),
      });

      try {
        await setDoc(doc(db, "studentIdIndex", values.studentId), {
          uid: credential.user.uid,
          email: values.email,
        });
      } catch {
        // Lost a uniqueness race against another signup — roll back the
        // account we just created rather than leaving an orphaned user with
        // no way to log in via studentId.
        await deleteDoc(doc(db, "users", credential.user.uid));
        await credential.user.delete();
        setSubmitError("이미 사용 중인 학번/사번이에요");
        return;
      }

      router.push("/");
    } catch (error) {
      setSubmitError(toKoreanAuthError(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14">
      <div>
        <h1 className="text-2xl font-extrabold">회원가입</h1>
        <p className="mt-1 text-sm text-muted">온라인전시관에 참여하려면 정보를 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="이름" placeholder="홍길동" {...register("name")} error={errors.name?.message} />
        <Input
          label="전화번호"
          placeholder="010-1234-5678"
          {...register("phone")}
          error={errors.phone?.message}
        />
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
        <Input
          label="이메일"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
          error={errors.email?.message}
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="6자 이상"
          {...register("password")}
          error={errors.password?.message}
        />
        <Input
          label="비밀번호 확인"
          type="password"
          {...register("passwordConfirm")}
          error={errors.passwordConfirm?.message}
        />

        {submitError && <ErrorText>{submitError}</ErrorText>}

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          가입하기
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-primary">
          로그인
        </Link>
      </p>
    </div>
  );
}
