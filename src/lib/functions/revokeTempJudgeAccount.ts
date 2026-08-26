import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export async function revokeTempJudgeAccount(uid: string): Promise<void> {
  const call = httpsCallable(functions, "revokeTempJudgeAccount");
  await call({ uid });
}
