"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { loginSchema, type LoginFormValues } from "@/lib/validation/authSchemas";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      const indexSnap = await getDoc(doc(db, "studentIdIndex", values.studentId));
      if (!indexSnap.exists()) {
        setSubmitError("학번/사번 또는 비밀번호가 올바르지 않아요");
        return;
      }
      const { email } = indexSnap.data() as { email: string };
      await signInWithEmailAndPassword(auth, email, values.password);
      router.push("/");
    } catch (error) {
      setSubmitError(toKoreanAuthError(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
      <div>
        <h1 className="text-2xl font-extrabold">로그인</h1>
        <p className="mt-1 text-sm text-muted">온라인전시관에 다시 오신 것을 환영해요.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="학번/사번"
          type="text"
          placeholder="학번 또는 사번을 입력해주세요"
          {...register("studentId")}
          error={errors.studentId?.message}
        />
        <Input
          label="비밀번호"
          type="password"
          {...register("password")}
          error={errors.password?.message}
        />
        <Link href="/forgot-password" className="-mt-2 self-end text-xs font-semibold text-primary">
          비밀번호를 잊으셨나요?
        </Link>

        {submitError && <ErrorText>{submitError}</ErrorText>}

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          로그인
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          회원가입
        </Link>
      </p>
    </div>
  );
}
