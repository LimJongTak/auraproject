"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

export function ImageInsertButton({
  upload,
  onInsert,
}: {
  upload: (file: File) => Promise<string>;
  onInsert: (markdown: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(false);
    try {
      const url = await upload(file);
      onInsert(`\n![](${url})\n`);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="JPG, PNG, WebP 등 이미지 파일 (최대 5MB) · 권장 규격 1200×675px (16:9 가로형)"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
      >
        <ImagePlus size={14} /> {uploading ? "업로드 중..." : "본문에 이미지 삽입 (최대 5MB)"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <span className="text-xs font-medium text-red-600">업로드 실패</span>}
    </span>
  );
}
