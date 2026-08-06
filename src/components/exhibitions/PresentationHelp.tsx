import { Info } from "lucide-react";

export function PresentationHelp() {
  return (
    <details className="group rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground marker:content-none">
        <Info size={15} className="shrink-0 text-muted" />
        발표자료가 없다면?
        <span className="ml-auto text-xs font-normal text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-muted">
        <ul className="list-disc space-y-1 pl-4">
          <li>발표(PPT) 자료가 있다면 PDF로 내보내서 올려주세요.</li>
          <li>
            별도 발표자료가 없다면 화면 캡처 이미지들을 모아 PDF 한 개로 묶어 올려도 괜찮아요.
          </li>
          <li>
            <b>도메인 없이 로컬 환경에서만 플랫폼을 구축했다면</b>, 로컬 화면을 캡처한 이미지들을 PDF로 묶어 이 자리에
            올려주세요 — 심사에 필요한 화면 증빙이 됩니다.
          </li>
        </ul>
      </div>
    </details>
  );
}
