"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toKoreanAuthError } from "@/lib/firebase/errors";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validation/authSchemas";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CenteredSpinner, ErrorText } from "@/components/ui/misc";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "no-code">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    if (!oobCode) {
      // No code in the URL usually means Firebase's own hosted reset page
      // already completed the reset and sent the user here via its
      // "continue" link — not a broken link, so don't scare them with an
      // error message.
      setStatus("no-code");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        setEmail(verifiedEmail);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [oobCode]);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!oobCode) return;
    setSubmitError(null);
    try {
      await confirmPasswordReset(auth, oobCode, values.newPassword);
      setDone(true);
    } catch (error) {
      setSubmitError(toKoreanAuthError(error));
    }
  }

  if (status === "checking") return <CenteredSpinner />;

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-semibold">링크가 만료되었거나 올바르지 않아요</p>
        <p className="mt-1 text-sm text-muted">비밀번호 찾기를 다시 시도해주세요.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-primary">
          비밀번호 찾기로 이동
        </Link>
      </div>
    );
  }

  if (status === "no-code") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-semibold">비밀번호 재설정을 완료하셨다면 로그인해주세요</p>
        <p className="mt-1 text-sm text-muted">
          아직 재설정하지 않으셨다면 비밀번호 찾기를 다시 시도해주세요.
        </p>
        <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
          <Link href="/login" className="text-primary">
            로그인하러 가기
          </Link>
          <Link href="/forgot-password" className="text-primary">
            비밀번호 찾기
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-semibold">비밀번호가 변경됐어요</p>
        <p className="mt-1 text-sm text-muted">새 비밀번호로 로그인해주세요.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-primary">
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-20">
      <div>
        <h1 className="text-2xl font-extrabold">새 비밀번호 설정</h1>
        <p className="mt-1 text-sm text-muted">{email}의 새 비밀번호를 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          비밀번호 변경
        </Button>
      </form>
    </div>
  );
}
