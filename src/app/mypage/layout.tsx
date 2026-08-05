"use client";

import { RequireAuth } from "@/components/auth/Guard";
import { MyPageShell } from "@/components/mypage/MyPageShell";

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <MyPageShell>{children}</MyPageShell>
    </RequireAuth>
  );
}
