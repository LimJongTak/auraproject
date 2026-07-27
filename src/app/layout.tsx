import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { FirebaseConfigGate } from "@/components/layout/FirebaseConfigGate";
import { VisitTracker } from "@/components/layout/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scnuai.com"),
  title: "국립순천대학교 AI인재양성부트캠프사업단",
  description: "국립순천대학교 AI인재양성부트캠프사업단",
  openGraph: {
    title: "국립순천대학교 AI인재양성부트캠프사업단",
    description: "국립순천대학교 AI인재양성부트캠프사업단",
    url: "https://scnuai.com",
    siteName: "국립순천대학교 AI인재양성부트캠프사업단",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <FirebaseConfigGate>
          <AuthProvider>
            <VisitTracker />
            <Header />
            <main className="flex-1">{children}</main>
          </AuthProvider>
        </FirebaseConfigGate>
      </body>
    </html>
  );
}
