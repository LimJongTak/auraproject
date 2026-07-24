// pdfjs-dist touches browser-only globals (DOMMatrix, etc.) at module scope,
// which crashes Next's server-side prerender pass of this "use client" page.
// Load it lazily, only once actually invoked in the browser.
async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 60;
const PAGE_RENDER_SCALE = 2; // ~144 DPI
const MAX_SIDE_PX = 2000;
const THUMBNAIL_SCALE = 0.55;

export class PdfValidationError extends Error {}

export interface RenderedPage {
  index: number;
  blob: Blob;
  contentType: string;
}

export interface RenderProgress {
  phase: "rendering" | "done";
  currentPage: number;
  totalPages: number;
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.8): Promise<{ blob: Blob; contentType: string }> {
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (webp) return { blob: webp, contentType: "image/webp" };
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (jpeg) return { blob: jpeg, contentType: "image/jpeg" };
  throw new Error("이미지 변환에 실패했어요");
}

function scaleForViewport(baseWidth: number, baseHeight: number, scale: number): number {
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_SIDE_PX) return scale;
  return scale * (MAX_SIDE_PX / longestSide);
}

export function validatePdfFile(file: File): void {
  if (file.type !== "application/pdf") {
    throw new PdfValidationError("PDF 파일만 업로드할 수 있어요");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfValidationError("PDF 파일은 50MB 이하만 업로드할 수 있어요");
  }
}

export interface RenderPdfResult {
  pages: RenderedPage[];
  thumbnail: { blob: Blob; contentType: string };
}

export async function renderPdfToImages(
  file: File,
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderPdfResult> {
  validatePdfFile(file);

  const pdfjsLib = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new PdfValidationError(`PDF는 최대 ${MAX_PDF_PAGES}페이지까지 지원해요`);
  }

  const pages: RenderedPage[] = [];
  let thumbnail: { blob: Blob; contentType: string } | null = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.({ phase: "rendering", currentPage: pageNumber, totalPages: pdf.numPages });

    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const effectiveScale = scaleForViewport(baseViewport.width, baseViewport.height, PAGE_RENDER_SCALE);
    const viewport = page.getViewport({ scale: effectiveScale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    await page.render({ canvas, viewport }).promise;
    const { blob, contentType } = await canvasToBlob(canvas);
    pages.push({ index: pageNumber - 1, blob, contentType });

    if (pageNumber === 1) {
      const thumbScale = scaleForViewport(baseViewport.width, baseViewport.height, THUMBNAIL_SCALE);
      const thumbViewport = page.getViewport({ scale: thumbScale });
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = Math.round(thumbViewport.width);
      thumbCanvas.height = Math.round(thumbViewport.height);
      await page.render({ canvas: thumbCanvas, viewport: thumbViewport }).promise;
      thumbnail = await canvasToBlob(thumbCanvas, 0.75);
    }

    page.cleanup();
  }

  onProgress?.({ phase: "done", currentPage: pdf.numPages, totalPages: pdf.numPages });

  if (!thumbnail) throw new Error("썸네일 생성에 실패했어요");
  return { pages, thumbnail };
}
