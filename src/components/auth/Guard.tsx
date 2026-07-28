"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CenteredSpinner } from "@/components/ui/misc";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace("/login");
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) return <CenteredSpinner />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
    } else if (profile && profile.role !== "admin") {
      router.replace("/");
    }
  }, [loading, firebaseUser, profile, router]);

  if (loading || !firebaseUser || !profile || profile.role !== "admin") return <CenteredSpinner />;
  return <>{children}</>;
}

export function RequireJudgeOrAdmin({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const allowed = (role: string | undefined) => role === "admin" || role === "judge";

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
    } else if (profile && !allowed(profile.role)) {
      router.replace("/");
    }
  }, [loading, firebaseUser, profile, router]);

  if (loading || !firebaseUser || !profile || !allowed(profile.role)) return <CenteredSpinner />;
  return <>{children}</>;
}
