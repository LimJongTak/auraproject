"use client";

import { useState } from "react";
import { Info } from "lucide-react";

const providers = [
  {
    name: "Vercel",
    url: "https://vercel.com",
    steps: [
      "vercel.com에 GitHub 계정으로 가입해요.",
      "\"Add New → Project\"에서 배포할 저장소를 선택해요.",
      "빌드 설정은 기본값 그대로 두고 Deploy를 눌러요.",
      "배포가 끝나면 발급된 xxx.vercel.app 주소를 복사해 프로젝트 링크에 붙여넣어요.",
    ],
  },
  {
    name: "Render",
    url: "https://render.com",
    steps: [
      "render.com에 GitHub 계정으로 가입해요.",
      "\"New → Web Service\"에서 배포할 저장소를 연결해요.",
      "Build/Start 명령어를 입력하고 무료(Free) 플랜으로 생성해요.",
      "배포가 끝나면 발급된 xxx.onrender.com 주소를 복사해 프로젝트 링크에 붙여넣어요.",
    ],
  },
] as const;

export function DeployHelp() {
  const [selected, setSelected] = useState<(typeof providers)[number]["name"]>("Vercel");
  const active = providers.find((p) => p.name === selected)!;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-2 text-sm text-muted">
        <Info size={15} className="mt-0.5 shrink-0" />
        직접 구매한 도메인이 없어도 괜찮아요. Vercel이나 Render 같은 무료 서비스로 배포한 주소를 입력해도 무방해요.
      </p>
      <div className="rounded-xl border border-border bg-surface text-sm">
        <div className="flex gap-1 border-b border-border p-1.5">
          {providers.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setSelected(p.name)}
              className={`flex-1 rounded-lg px-3 py-1.5 font-semibold transition ${
                selected === p.name ? "bg-primary text-white" : "text-muted hover:bg-white"
              }`}
            >
              {p.name} 사용법
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-4 py-3 text-muted">
          <ol className="list-decimal space-y-1 pl-4">
            {active.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start font-semibold text-primary hover:underline"
          >
            {active.name} 바로가기
          </a>
        </div>
      </div>
    </div>
  );
}
