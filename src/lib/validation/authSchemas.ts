import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요").max(30),
    phone: z
      .string()
      .min(1, "전화번호를 입력해주세요")
      .regex(/^[0-9-]{9,14}$/, "올바른 전화번호 형식이 아니에요"),
    school: z.string().min(1, "학교명을 입력해주세요").max(50),
    department: z.string().min(1, "학과를 입력해주세요").max(50),
    grade: z.string().min(1, "학년을 입력해주세요").max(10),
    studentId: z.string().min(1, "학번을 입력해주세요").max(20),
    email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아니에요"),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 해요"),
    passwordConfirm: z.string().min(1, "비밀번호를 다시 입력해주세요"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요",
    path: ["passwordConfirm"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아니에요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아니에요"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
    newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 해요"),
    newPasswordConfirm: z.string().min(1, "새 비밀번호를 다시 입력해주세요"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않아요",
    path: ["newPasswordConfirm"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 해요"),
    newPasswordConfirm: z.string().min(1, "새 비밀번호를 다시 입력해주세요"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않아요",
    path: ["newPasswordConfirm"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
