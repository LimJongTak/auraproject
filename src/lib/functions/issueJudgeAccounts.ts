import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export interface IssuedJudgeAccount {
  uid: string;
  loginCode: string;
  password: string;
  name: string;
}

interface IssueJudgeAccountsInput {
  categoryId: string;
  count: number;
  namePrefix?: string;
}

interface IssueJudgeAccountsResult {
  accounts: IssuedJudgeAccount[];
}

// Returned passwords are never stored anywhere else — the caller must show
// or copy them immediately, since there's no way to retrieve them again.
export async function issueJudgeAccounts(input: IssueJudgeAccountsInput): Promise<IssuedJudgeAccount[]> {
  const call = httpsCallable<IssueJudgeAccountsInput, IssueJudgeAccountsResult>(functions, "issueJudgeAccounts");
  const result = await call(input);
  return result.data.accounts;
}
