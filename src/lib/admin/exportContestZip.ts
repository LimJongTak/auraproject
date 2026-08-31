import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { Category, Exhibition } from "@/types/models";

// Windows (and to a lesser extent zip tooling in general) rejects these in
// file/folder names. Swapped for lookalike fullwidth Unicode punctuation
// instead of stripping them outright, so e.g. a title with a colon still
// reads naturally in the extracted folder name.
const UNSAFE_CHAR_MAP: Record<string, string> = {
  "\\": "＼",
  "/": "／",
  ":": "：",
  "*": "＊",
  "?": "？",
  '"': "＂",
  "<": "＜",
  ">": "＞",
  "|": "｜",
};

function sanitizeName(name: string, maxLength = 80): string {
  const swapped = name.replace(/[\\/:*?"<>|]/g, (c) => UNSAFE_CHAR_MAP[c] ?? "-");
  const trimmed = swapped.trim().replace(/[.\s]+$/, "");
  return (trimmed || "이름없음").slice(0, maxLength);
}

// A4 width in points (72pt/inch) — each page keeps the source image's own
// aspect ratio, just scaled to this width, since slide exports are usually
// all one consistent shape but there's no guarantee across every submission.
const PDF_PAGE_WIDTH_PT = 595;
const PAGE_FETCH_CONCURRENCY = 3;

async function fetchImageAsJpeg(pageUrl: string): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const res = await fetch(`/api/storage-proxy?url=${encodeURIComponent(pageUrl)}`);
  if (!res.ok) throw new Error(`이미지를 불러오지 못했어요: ${pageUrl}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 생성하지 못했어요");
    ctx.drawImage(bitmap, 0, 0);
    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했어요"))), "image/jpeg", 0.85);
    });
    return { bytes: new Uint8Array(await jpegBlob.arrayBuffer()), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

// Firebase Storage doesn't keep the original PDF — presentation files are
// converted to per-page images client-side at submission time and only the
// images are ever uploaded (see renderPdfToImages.ts / uploadExhibitionPages
// .ts), nothing to just hand back as-is. This reconstitutes a PDF from those
// page images instead, visually equivalent to the original at the resolution
// it was rendered at.
async function buildPresentationPdf(pageImageUrls: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pages: Array<{ bytes: Uint8Array; width: number; height: number } | null> = new Array(pageImageUrls.length).fill(null);

  let cursor = 0;
  async function worker() {
    while (cursor < pageImageUrls.length) {
      const index = cursor++;
      pages[index] = await fetchImageAsJpeg(pageImageUrls[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(PAGE_FETCH_CONCURRENCY, pageImageUrls.length) }, () => worker())
  );

  for (const page of pages) {
    if (!page) continue;
    const jpg = await pdfDoc.embedJpg(page.bytes);
    const height = PDF_PAGE_WIDTH_PT * (page.height / page.width);
    const pdfPage = pdfDoc.addPage([PDF_PAGE_WIDTH_PT, height]);
    pdfPage.drawImage(jpg, { x: 0, y: 0, width: PDF_PAGE_WIDTH_PT, height });
  }

  return pdfDoc.save();
}

function introText(ex: Exhibition, categoryName: string): string {
  const lines = [
    ex.title,
    `팀명: ${ex.teamName}`,
    `대회: ${categoryName}`,
    "",
    "[한줄 소개]",
    ex.oneLiner,
    "",
    "[프로젝트 링크]",
    ex.projectUrl ?? "등록된 링크가 없어요",
  ];
  if (ex.hashtags && ex.hashtags.length > 0) {
    lines.push("", "[해시태그]", ex.hashtags.map((h) => `#${h}`).join(" "));
  }
  return lines.join("\n");
}

// projectUrl is a free-text field a team enters at submission — the "must
// start with http(s)://" check on that form is client-side only, nothing
// server-side stops a crafted value (e.g. via a direct Firestore write)
// containing CR/LF or a non-http(s) scheme. Writing that straight into a
// .url file's InternetShortcut content would let it inject extra INI keys
// (CRLF injection) or point the shortcut at file:// / a UNC path — the
// latter is a known forced-authentication vector (just Explorer rendering
// the shortcut's icon can trigger an outbound SMB auth attempt) — against
// whichever admin later opens the exported zip. Re-validated here, at the
// point this untrusted value is used, rather than trusting it was already
// clean.
function isSafeHttpUrl(value: string): boolean {
  if (/[\r\n\0]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function urlShortcutContent(url: string): string {
  // Windows Internet Shortcut format — double-clicking opens the default
  // browser straight to the project's homepage.
  return `[InternetShortcut]\r\nURL=${url}\r\n`;
}

export interface ExportProgress {
  current: number;
  total: number;
  title: string;
}

// Builds "{대회명}.zip" containing one folder per published exhibition
// ("{순번}. {작품명}"), each holding an intro text file, a .url shortcut to
// the project link (when set), and a reconstructed PDF of the presentation
// pages (when any were uploaded).
export async function buildContestZip(
  category: Category,
  exhibitions: Exhibition[],
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const published = exhibitions
    .filter((ex) => ex.status === "published")
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

  const zip = new JSZip();
  const contestFolder = zip.folder(sanitizeName(category.name, 120))!;

  for (let i = 0; i < published.length; i++) {
    const ex = published[i];
    onProgress?.({ current: i + 1, total: published.length, title: ex.title });

    const folder = contestFolder.folder(`${i + 1}. ${sanitizeName(ex.title)}`)!;
    folder.file("작품 소개.txt", introText(ex, category.name));
    if (ex.projectUrl && isSafeHttpUrl(ex.projectUrl)) {
      folder.file("프로젝트 링크.url", urlShortcutContent(ex.projectUrl));
    }
    if (ex.pageImageUrls && ex.pageImageUrls.length > 0) {
      const pdfBytes = await buildPresentationPdf(ex.pageImageUrls);
      folder.file("발표자료.pdf", pdfBytes);
    }
  }

  return zip.generateAsync({ type: "blob" });
}
