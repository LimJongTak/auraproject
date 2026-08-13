import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class ThumbnailValidationError extends Error {}

export function validateThumbnailImage(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ThumbnailValidationError("JPG, PNG, WebP 이미지 파일만 업로드할 수 있어요");
  }
  if (file.size > MAX_THUMBNAIL_BYTES) {
    throw new ThumbnailValidationError("이미지 파일은 5MB 이하만 업로드할 수 있어요");
  }
}

export async function uploadExhibitionThumbnail(exhibitionId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const storageRef = ref(storage, `exhibitions/${exhibitionId}/thumbnail-manual.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
