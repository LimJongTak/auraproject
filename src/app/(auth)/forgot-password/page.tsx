"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validation/authSchemas";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";

export default function ForgotPasswordPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setSubmitError(null);
    try {
      await sendPasswordResetEmail(auth, values.email, {
        url: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch (error) {
      setSubmitError(toKoreanAuthError(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
      <div>
        <h1 className="text-2xl font-extrabold">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-muted">가입한 이메일로 비밀번호 재설정 링크를 보내드려요.</p>
      </div>

      {sent ? (
        <div className="rounded-xl bg-primary-light px-4 py-3 text-sm font-medium text-primary-dark">
          이메일을 보냈어요. 받은편지함(스팸함 포함)을 확인해주세요.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="이메일"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            error={errors.email?.message}
          />

          {submitError && <ErrorText>{submitError}</ErrorText>}

          <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
            재설정 이메일 보내기
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
