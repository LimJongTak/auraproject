import { Info } from "lucide-react";

const codeClass = "rounded bg-white px-1 py-0.5 text-xs";

export function LinkPreviewHelp() {
  return (
    <details className="group rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground marker:content-none">
        <Info size={15} className="shrink-0 text-muted" />
        미리보기 이미지가 안 보이시나요?
        <span className="ml-auto text-xs font-normal text-muted transition group-open:rotate-180">▾</span>
      </summary>

      <div className="mt-3 flex flex-col gap-2 text-muted">
        <p>
          프로젝트 페이지의 <code className={codeClass}>&lt;head&gt;</code>에 아래 메타 태그가 있어야 제목·설명·이미지가
          표시돼요.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-foreground px-3 py-2 text-xs text-white">
          {`<meta property="og:title" content="프로젝트 제목" />
<meta property="og:description" content="한 줄 소개" />
<meta property="og:image" content="https://example.com/thumbnail.png" />`}
        </pre>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <code className={codeClass}>og:image</code>가 없으면 <code className={codeClass}>twitter:image</code>도
            확인해요.
          </li>
          <li>이미지 주소는 https://로 시작하는 절대경로를 권장해요.</li>
          <li>
            페이지가 5초 안에 응답해야 하고, <b>localhost·사설 IP 링크는 미리보기를 만들 수 없어요</b> — 실제
            배포(공개)된 주소를 사용해주세요.
          </li>
          <li>Notion, Google Sites, Framer, Vercel 등으로 만든 페이지는 보통 이 태그가 자동으로 들어가 있어요.</li>
        </ul>
        <p>
          <a
            href="https://developers.facebook.com/tools/debug/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Facebook 공유 디버거
          </a>
          에 링크를 넣어보면 미리보기가 어떻게 나올지 미리 확인할 수 있어요.
        </p>
      </div>
    </details>
  );
}
