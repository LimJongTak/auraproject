"use client";

import { RequireAdmin } from "@/components/auth/Guard";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
