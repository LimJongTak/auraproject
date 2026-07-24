import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import type { RenderedPage } from "@/lib/pdf/renderPdfToImages";

const CONCURRENCY = 3;

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
}

function extFromContentType(contentType: string): string {
  return contentType === "image/webp" ? "webp" : "jpg";
}

async function uploadOne(
  exhibitionId: string,
  path: string,
  blob: Blob,
  contentType: string,
  onBytes: (transferred: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, blob, { contentType });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onBytes(snap.bytesTransferred),
      reject,
      () => resolve()
    );
  });
  return getDownloadURL(storageRef);
}

export async function uploadExhibitionPages(
  exhibitionId: string,
  pages: RenderedPage[],
  thumbnail: { blob: Blob; contentType: string },
  onProgress?: (progress: UploadProgress) => void
): Promise<{ pageImageUrls: string[]; thumbnailUrl: string }> {
  const pageImageUrls: string[] = new Array(pages.length);
  const bytesPerFile = new Map<string, number>();
  const totalBytes = pages.reduce((sum, p) => sum + p.blob.size, 0) + thumbnail.blob.size;

  function reportProgress() {
    const transferred = Array.from(bytesPerFile.values()).reduce((a, b) => a + b, 0);
    onProgress?.({ bytesTransferred: transferred, totalBytes });
  }

  const thumbnailKey = "thumbnail";
  const thumbnailPromise = uploadOne(
    exhibitionId,
    `exhibitions/${exhibitionId}/thumbnail.${extFromContentType(thumbnail.contentType)}`,
    thumbnail.blob,
    thumbnail.contentType,
    (bytes) => {
      bytesPerFile.set(thumbnailKey, bytes);
      reportProgress();
    }
  );

  let cursor = 0;
  async function worker() {
    while (cursor < pages.length) {
      const page = pages[cursor++];
      const key = `page-${page.index}`;
      const path = `exhibitions/${exhibitionId}/pages/${String(page.index).padStart(3, "0")}.${extFromContentType(
        page.contentType
      )}`;
      const url = await uploadOne(exhibitionId, path, page.blob, page.contentType, (bytes) => {
        bytesPerFile.set(key, bytes);
        reportProgress();
      });
      pageImageUrls[page.index] = url;
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, pages.length) }, () => worker());
  const [thumbnailUrl] = await Promise.all([thumbnailPromise, ...workers]);

  return { pageImageUrls, thumbnailUrl };
}
