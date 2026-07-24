const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "이미 가입된 이메일이에요",
  "auth/invalid-email": "올바른 이메일 형식이 아니에요",
  "auth/weak-password": "비밀번호는 6자 이상이어야 해요",
  "auth/user-not-found": "가입되지 않은 이메일이에요",
  "auth/wrong-password": "비밀번호가 올바르지 않아요",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않아요",
  "auth/too-many-requests": "잠시 후 다시 시도해주세요",
};

export function toKoreanAuthError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (MESSAGES[code]) return MESSAGES[code];
  }
  return "요청 처리 중 문제가 발생했어요. 다시 시도해주세요.";
}
