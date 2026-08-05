import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

interface BackfillResult {
  created: number;
  skipped: string[];
}

export async function backfillStudentIdIndex(): Promise<BackfillResult> {
  const call = httpsCallable<void, BackfillResult>(functions, "backfillStudentIdIndex");
  const result = await call();
  return result.data;
}
