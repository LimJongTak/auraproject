"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { signupSchema, type SignupFormValues } from "@/lib/validation/authSchemas";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";

export default function SignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    setSubmitError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(credential.user, { displayName: values.name });
      await setDoc(doc(db, "users", credential.user.uid), {
        name: values.name,
        phone: values.phone,
        school: values.school,
        department: values.department,
        grade: values.grade,
        studentId: values.studentId,
        email: values.email,
        role: "user",
        createdAt: serverTimestamp(),
      });
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
        <Input label="학교" placeholder="OO대학교" {...register("school")} error={errors.school?.message} />
        <Input label="학과" placeholder="컴퓨터공학과" {...register("department")} error={errors.department?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="학년" placeholder="3학년" {...register("grade")} error={errors.grade?.message} />
          <Input
            label="학번"
            placeholder="20231234"
            {...register("studentId")}
            error={errors.studentId?.message}
          />
        </div>
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
