"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Trash2, UserPlus, X } from "lucide-react";
import { listAllUsers } from "@/lib/firestore/users";
import { assignJudgeToCategory, listAssignmentsForCategory, unassignJudge } from "@/lib/firestore/judgeAssignments";
import { issueJudgeAccounts, type IssuedJudgeAccount } from "@/lib/functions/issueJudgeAccounts";
import { revokeTempJudgeAccount } from "@/lib/functions/revokeTempJudgeAccount";
import type { JudgeAssignment, UserProfile } from "@/types/models";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorText } from "@/components/ui/misc";

const MAX_BULK_ISSUE = 30;

export function JudgeAssignmentPanel({
  categoryId,
  categoryName,
  onChange,
}: {
  categoryId: string;
  categoryName: string;
  // Notifies the parent whenever the assignment list is (re)loaded, so pages
  // that show their own summary of who's assigned (e.g. the judging-status
  // panel) can stay in sync without duplicating this panel's fetch-on-mount.
  onChange?: (assignments: JudgeAssignment[]) => void;
}) {
  const [assignments, setAssignments] = useState<JudgeAssignment[] | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [search, setSearch] = useState("");
  const [assigningUid, setAssigningUid] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [count, setCount] = useState("5");
  const [namePrefix, setNamePrefix] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issuedAccounts, setIssuedAccounts] = useState<IssuedJudgeAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshAssignments() {
    const next = await listAssignmentsForCategory(categoryId);
    setAssignments(next);
    onChange?.(next);
  }

  useEffect(() => {
    refreshAssignments();
    listAllUsers().then(setUsers);
    // categoryId only — this panel is mounted per contest detail page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const assignedUids = useMemo(() => new Set((assignments ?? []).map((a) => a.uid)), [assignments]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !users) return [];
    return users
      .filter((u) => u.role !== "admin" && !assignedUids.has(u.uid))
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.studentId.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [users, search, assignedUids]);

  async function handleAssign(user: UserProfile) {
    setAssigningUid(user.uid);
    setError(null);
    try {
      await assignJudgeToCategory({ uid: user.uid, categoryId, categoryName, judgeName: user.name });
      setSearch("");
      await refreshAssignments();
    } catch {
      setError("심사위원 지정에 실패했어요");
    } finally {
      setAssigningUid(null);
    }
  }

  async function handleUnassign(assignment: JudgeAssignment) {
    if (!confirm(`"${assignment.judgeName}"님을 이 대회의 심사위원에서 해제할까요?`)) return;
    setRemovingId(assignment.id);
    setError(null);
    try {
      await unassignJudge(assignment.uid, categoryId);
      await refreshAssignments();
    } catch {
      setError("심사위원 해제에 실패했어요");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRevoke(assignment: JudgeAssignment) {
    if (!confirm(`임시 계정 "${assignment.judgeName}"을(를) 완전히 삭제할까요? 로그인 계정 자체가 삭제되며 되돌릴 수 없어요.`))
      return;
    setRemovingId(assignment.id);
    setError(null);
    try {
      await revokeTempJudgeAccount(assignment.uid);
      await refreshAssignments();
    } catch {
      setError("임시 계정 삭제에 실패했어요");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleIssue() {
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1 || n > MAX_BULK_ISSUE) {
      setError(`발급 수량은 1~${MAX_BULK_ISSUE}개 사이로 입력해주세요`);
      return;
    }
    setIssuing(true);
    setError(null);
    try {
      const accounts = await issueJudgeAccounts({ categoryId, count: n, namePrefix: namePrefix.trim() || undefined });
      setIssuedAccounts(accounts);
      await refreshAssignments();
    } catch {
      setError("임시 계정 발급에 실패했어요");
    } finally {
      setIssuing(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can fail (e.g. insecure context) — the codes/
      // passwords stay visible on screen either way, so this is non-fatal.
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-5">
      <h2 className="font-bold">심사위원 관리</h2>
      <p className="mt-1 text-sm text-muted">이 대회를 심사할 수 있는 계정을 지정해요. 다른 대회의 심사 권한에는 영향을 주지 않아요.</p>

      {error && (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      <div className="mt-4">
        {assignments === null ? (
          <p className="text-sm text-muted">불러오는 중...</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted">아직 지정된 심사위원이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{a.judgeName}</p>
                  {a.isTemporary && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">임시</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={removingId === a.id}
                  onClick={() => (a.isTemporary ? handleRevoke(a) : handleUnassign(a))}
                >
                  <Trash2 size={14} /> {a.isTemporary ? "계정 삭제" : "해제"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold">기존 사용자 지정</p>
        <div className="mt-2">
          <Input
            placeholder="이름, 이메일, 학번/사번으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search.trim() && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {searchResults.length === 0 ? (
              <p className="py-2 text-xs text-muted">일치하는 사용자가 없어요.</p>
            ) : (
              searchResults.map((u) => (
                <li key={u.uid} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2">
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <Button size="sm" loading={assigningUid === u.uid} onClick={() => handleAssign(u)}>
                    <UserPlus size={14} /> 지정
                  </Button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold">임시 계정 일괄 발급</p>
        <p className="mt-1 text-xs text-muted">
          이메일이 없는 외부 심사위원 등을 위해, 로그인 코드와 임시 비밀번호를 자동 생성해 한 번에 여러 개 발급해요.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Input
              label="발급 수량"
              type="number"
              min={1}
              max={MAX_BULK_ISSUE}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Input
              label="이름 접두어 (선택)"
              placeholder="예: 외부심사위원"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
            />
          </div>
          <Button loading={issuing} onClick={handleIssue}>
            <KeyRound size={15} /> 발급
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted">한 번에 최대 {MAX_BULK_ISSUE}개까지 발급할 수 있어요.</p>
      </div>

      {issuedAccounts && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-900">
              {issuedAccounts.length}개 계정이 발급됐어요 — 비밀번호는 지금만 확인할 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => setIssuedAccounts(null)}
              className="shrink-0 text-amber-700 hover:text-amber-900"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-amber-700">
                  <th className="py-1 pr-4 font-semibold">이름</th>
                  <th className="py-1 pr-4 font-semibold">로그인 코드</th>
                  <th className="py-1 pr-4 font-semibold">임시 비밀번호</th>
                  <th className="py-1 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {issuedAccounts.map((a) => (
                  <tr key={a.uid} className="border-t border-amber-200/60">
                    <td className="py-1.5 pr-4">{a.name}</td>
                    <td className="py-1.5 pr-4 font-mono">{a.loginCode}</td>
                    <td className="py-1.5 pr-4 font-mono">{a.password}</td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => copyText(`${a.loginCode}\t${a.password}`)}
                        className="text-amber-700 hover:text-amber-900"
                        aria-label="복사"
                      >
                        <Copy size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              copyText(issuedAccounts.map((a) => `${a.name}\t${a.loginCode}\t${a.password}`).join("\n"))
            }
          >
            <Copy size={14} /> 전체 복사
          </Button>
        </div>
      )}
    </div>
  );
}
