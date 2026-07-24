"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/types/models";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null);
        setProfileLoading(false);
      },
      () => setProfileLoading(false)
    );
    return () => unsub();
  }, [firebaseUser]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading: authLoading || (!!firebaseUser && profileLoading),
    }),
    [firebaseUser, profile, authLoading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
