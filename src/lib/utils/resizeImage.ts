// Uploaded images (exhibition thumbnails, banners, notice images) come
// straight from a user's camera/screenshot and can be several MB at full
// resolution — far larger than the small card/banner slots they're shown
// in. This downscales + re-encodes client-side before upload so visitors
// aren't downloading multi-megabyte originals for a 300px-wide card.
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ResizedImage {
  blob: Blob;
  ext: "webp" | "jpg";
}

export async function resizeImageFile(file: File, maxSide = 1600, quality = 0.85): Promise<ResizedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있어요");
  }

  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리에 실패했어요");
  ctx.drawImage(img, 0, 0, width, height);

  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (webp) return { blob: webp, ext: "webp" };
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (jpeg) return { blob: jpeg, ext: "jpg" };
  throw new Error("이미지 변환에 실패했어요");
}
