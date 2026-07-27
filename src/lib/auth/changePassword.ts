import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from "firebase/auth";

export async function changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
  if (!user.email) throw new Error("이메일 계정만 비밀번호를 변경할 수 있어요");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}
