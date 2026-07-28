import { z } from "zod";

export const SCHOOL_OPTIONS = ["국립순천대학교"] as const;
export const DEPARTMENT_OPTIONS = ["인공지능공학전공", "전기공학전공", "전자공학전공"] as const;
export const GRADE_OPTIONS = ["1학년", "2학년", "3학년", "4학년"] as const;
export const SCHOOL_CUSTOM_OPTION = "직접입력";
export const DEPARTMENT_CUSTOM_OPTION = "직접입력";
export const GRADE_CUSTOM_OPTION = "기타";

// Shared by signup and the MyPage profile-edit form — kept as a plain shape
// (not a ZodObject with its own .refine) so each consumer can extend it with
// its own additional fields before applying the studentId cross-field check.
export const profileFieldsShape = {
  memberType: z.enum(["student", "staff"], { message: "구분을 선택해주세요" }),
  school: z.string().min(1, "학교를 입력해주세요").max(50),
  department: z.string().min(1, "학과를 입력해주세요").max(50),
  grade: z.string().min(1, "학년을 입력해주세요").max(20),
  studentId: z.string().max(20),
};

export function refineStudentId(data: { memberType: string; studentId: string }): boolean {
  return data.memberType !== "student" || /^\d{8}$/.test(data.studentId);
}

export const STUDENT_ID_REFINE_ISSUE: { message: string; path: [string] } = {
  message: "학번은 숫자 8자리로 입력해주세요",
  path: ["studentId"],
};

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요").max(30),
    phone: z
      .string()
      .min(1, "전화번호를 입력해주세요")
      .regex(/^[0-9-]{9,14}$/, "올바른 전화번호 형식이 아니에요"),
    ...profileFieldsShape,
    email: z.string().min(1, "이메일을 입력해주세요").email("올바른 이메일 형식이 아니에요"),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 해요"),
    passwordConfirm: z.string().min(1, "비밀번호를 다시 입력해주세요"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요",
    path: ["passwordConfirm"],
  })
  .refine(refineStudentId, STUDENT_ID_REFINE_ISSUE);

export type SignupFormValues = z.infer<typeof signupSchema>;

export const profileEditSchema = z.object(profileFieldsShape).refine(refineStudentId, STUDENT_ID_REFINE_ISSUE);

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

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
