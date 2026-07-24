import { AlertTriangle } from "lucide-react";
import { firebaseConfigured } from "@/lib/firebase/client";

export function FirebaseConfigGate({ children }: { children: React.ReactNode }) {
  if (firebaseConfigured) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="rounded-full bg-primary-light p-3 text-primary-dark">
        <AlertTriangle size={24} />
      </span>
      <h1 className="text-xl font-extrabold">Firebase 설정이 필요해요</h1>
      <p className="text-sm text-muted">
        아직 <code className="rounded bg-surface px-1.5 py-0.5">.env.local</code>에 Firebase 프로젝트 설정값이
        입력되지 않았어요. 프로젝트 루트의 <code className="rounded bg-surface px-1.5 py-0.5">SETUP.md</code> 안내를
        따라 Firebase 프로젝트를 만들고 설정값을 채운 뒤 개발 서버를 다시 시작해주세요.
      </p>
    </div>
  );
}
