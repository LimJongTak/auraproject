"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { RequireAdmin } from "@/components/auth/Guard";
import { useAuth } from "@/hooks/useAuth";
import { listAllUsers, setUserRole } from "@/lib/firestore/users";
import type { UserProfile } from "@/types/models";
import { Breadcrumb, CenteredSpinner } from "@/components/ui/misc";
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

  if (!users) return <CenteredSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "관리자", href: "/admin" }, { label: "사용자 관리" }]} />
      <h1 className="mt-4 text-2xl font-extrabold">사용자 관리</h1>

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
              </p>
              <p className="text-sm text-muted">
                {user.school} · {user.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={user.uid === firebaseUser?.uid}
              onClick={() => toggleRole(user)}
              className="shrink-0"
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
          </li>
        ))}
      </ul>
    </div>
  );
}
