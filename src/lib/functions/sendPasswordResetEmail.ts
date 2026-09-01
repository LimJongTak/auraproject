import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

interface SendPasswordResetEmailInput {
  email: string;
  continueUrl: string;
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
  const call = httpsCallable<SendPasswordResetEmailInput, { ok: true }>(functions, "sendPasswordResetEmail");
  await call(input);
}
