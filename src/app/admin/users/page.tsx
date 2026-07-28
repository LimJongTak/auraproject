"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, ShieldCheck, ShieldOff, UserX } from "lucide-react";
import { RequireAdmin } from "@/components/auth/Guard";
import { useAuth } from "@/hooks/useAuth";
import { listAllUsers, setUserRole } from "@/lib/firestore/users";
import { adminWithdrawUser } from "@/lib/functions/adminWithdrawUser";
import type { UserProfile } from "@/types/models";
import { Breadcrumb, CenteredSpinner, ErrorText } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";

export default function AdminUsersPage() {
  return (
    <RequireAdmin>
      <UsersManager />
    </RequireAdmin>
  );
}

function UsersManager() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [withdrawingUid, setWithdrawingUid] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  async function refresh() {
    setUsers(await listAllUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleRole(user: UserProfile) {
    await setUserRole(user.uid, user.role === "admin" ? "user" : "admin");
    refresh();
  }

  async function toggleJudge(user: UserProfile) {
    await setUserRole(user.uid, user.role === "judge" ? "user" : "judge");
    refresh();
  }

  async function handleWithdraw(user: UserProfile) {
    if (!confirm(`"${user.name}"님을 탈퇴시킬까요? 계정과 프로필이 삭제되며 되돌릴 수 없어요.`)) return;
    setWithdrawError(null);
    setWithdrawingUid(user.uid);
    try {
      await adminWithdrawUser(user.uid);
      await refresh();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "탈퇴 처리 중 문제가 발생했어요");
    } finally {
      setWithdrawingUid(null);
    }
  }

  if (!users) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "관리자", href: "/admin" }, { label: "사용자 관리" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">사용자 관리</h1>
      {withdrawError && <ErrorText>{withdrawError}</ErrorText>}

      <ul className="mt-6 flex flex-col gap-3">
        {users.map((user) => (
          <li key={user.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
            <div>
              <p className="font-bold">
                {user.name}
                {user.role === "admin" && (
                  <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                    관리자
                  </span>
                )}
                {user.role === "judge" && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    심사위원
                  </span>
                )}
              </p>
              <p className="text-sm text-muted">
                {user.school} · {user.email}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={user.uid === firebaseUser?.uid}
                onClick={() => toggleRole(user)}
              >
                {user.role === "admin" ? (
                  <>
                    <ShieldOff size={14} /> 권한 해제
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} /> 관리자 지정
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={user.uid === firebaseUser?.uid}
                onClick={() => toggleJudge(user)}
              >
                <ClipboardCheck size={14} /> {user.role === "judge" ? "심사위원 해제" : "심사위원 지정"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={user.uid === firebaseUser?.uid || withdrawingUid !== null}
                loading={withdrawingUid === user.uid}
                onClick={() => handleWithdraw(user)}
              >
                <UserX size={14} /> 탈퇴
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
