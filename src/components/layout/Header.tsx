"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/contest", label: "대회" },
  { href: "/exhibitions", label: "온라인전시관" },
  { href: "/team", label: "팀 구성" },
  { href: "/notices", label: "공지사항" },
];

export function Header() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const mobileLinks = [
    ...NAV_LINKS,
    ...(firebaseUser ? [{ href: "/mypage", label: "마이페이지" }, { href: "/inquiries", label: "문의하기" }] : []),
    ...(profile?.role === "admin" || profile?.role === "judge" ? [{ href: "/judge", label: "평가" }] : []),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "관리자" }] : []),
  ];

  async function handleLogout() {
    await signOut(auth);
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="relative flex h-16 w-full items-center justify-between px-4 md:h-[100px] md:pl-4 md:pr-8">
        <button
          className="relative z-10 shrink-0 text-foreground md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {menuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="block"
              >
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="block"
              >
                <Menu size={22} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <Link
          href="/"
          className="absolute left-1/2 flex shrink-0 -translate-x-1/2 items-center gap-1.5 sm:gap-2.5 md:static md:left-auto md:translate-x-0 md:gap-3"
        >
          <Image
            src="/scnu-logo.png"
            alt="국립순천대학교"
            width={237}
            height={58}
            className="hidden md:block md:h-11 md:w-auto"
            priority
          />
          <span className="hidden h-8 w-px bg-neutral-300 md:block" />
          <span className="whitespace-nowrap text-sm font-semibold text-neutral-900 sm:text-base md:text-xl">
            AI인재양성부트캠프사업단
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative py-2 text-lg font-bold text-foreground/80 transition hover:text-primary"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          {firebaseUser && (
            <Link
              href="/mypage"
              className="group relative py-2 text-lg font-bold text-foreground/80 transition hover:text-primary"
            >
              마이페이지
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {firebaseUser && (
            <Link
              href="/inquiries"
              className="group relative py-2 text-lg font-bold text-foreground/80 transition hover:text-primary"
            >
              문의하기
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {(profile?.role === "admin" || profile?.role === "judge") && (
            <Link
              href="/judge"
              className="group relative py-2 text-lg font-bold text-foreground/80 transition hover:text-primary"
            >
              평가
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="group relative py-2 text-lg font-bold text-foreground/80 transition hover:text-primary"
            >
              관리자
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {loading ? null : firebaseUser ? (
              <>
                <span className="text-sm text-muted">{profile?.name ?? firebaseUser.email}님</span>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-dark"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 bottom-0 z-30 flex flex-col overflow-y-auto bg-white md:hidden"
          >
            <nav className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6">
              {mobileLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i + 0.06, duration: 0.25, ease: "easeOut" }}
                  className="w-full"
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-2xl px-6 py-3.5 text-center text-2xl font-extrabold tracking-tight text-foreground transition active:bg-surface active:text-primary"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * mobileLinks.length + 0.06, duration: 0.25, ease: "easeOut" }}
              className="border-t border-border px-6 py-6"
            >
              {loading ? null : firebaseUser ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm text-muted">{profile?.name ?? firebaseUser.email}님</span>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-full border border-border px-4 py-3 text-sm font-semibold transition active:border-primary active:text-primary"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full rounded-full border border-border px-4 py-3 text-center text-sm font-semibold"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="w-full rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
