import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Firebase Storage doesn't have CORS configured for this bucket, so the
// browser can't fetch() exhibition page images cross-origin directly (an
// <img> tag works, but reading pixels off it via canvas — needed to
// reassemble a PDF client-side — requires an actual CORS-clean fetch). This
// relays just the bytes through our own origin instead. The underlying
// objects are already public (storage.rules: exhibitions/**/pages/* and
// thumbnails allow read: if true) — this changes nothing about who can read
// them, only where the request is allowed to come from and what path shape
// it has to match, so it can't be turned into an open fetch-anything proxy.
const ALLOWED_HOST = "firebasestorage.googleapis.com";
const MAX_BYTES = 10 * 1024 * 1024;

function isAllowed(url: URL): boolean {
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) return false;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) return false;
  return url.pathname.startsWith(`/v0/b/${bucket}/o/exhibitions%2F`);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "url이 필요해요" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "올바른 주소가 아니에요" }, { status: 400 });
  }
  if (!isAllowed(url)) {
    return NextResponse.json({ error: "허용되지 않은 주소예요" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url.toString());
  } catch {
    return NextResponse.json({ error: "파일을 가져오지 못했어요" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: "파일을 가져오지 못했어요" }, { status: 502 });
  }

  const declaredLength = Number(upstream.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BYTES) {
    return NextResponse.json({ error: "파일이 너무 커요" }, { status: 413 });
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "파일이 너무 커요" }, { status: 413 });
  }

  return new NextResponse(buffer, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}
