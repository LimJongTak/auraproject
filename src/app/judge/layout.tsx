"use client";

import { useAuth } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";

// Judges (non-admin) keep the plain page — the sidebar is admin-only
// navigation they can't use anyway. Admins get the same shell as /admin/*
// so 심사/시상 관리 doesn't drop them out of the admin menu.
export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  if (profile?.role === "admin") {
    return <AdminShell>{children}</AdminShell>;
  }
  return <>{children}</>;
}
