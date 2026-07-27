import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export async function adminWithdrawUser(uid: string): Promise<void> {
  const call = httpsCallable(functions, "adminWithdrawUser");
  await call({ uid });
}
