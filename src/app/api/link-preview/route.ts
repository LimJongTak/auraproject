import { NextRequest, NextResponse } from "next/server";
import { checkUrlAllowed } from "@/lib/linkPreview/ssrfGuard";
import { parseOgTags } from "@/lib/linkPreview/parseOg";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 150_000;
const MAX_REDIRECTS = 3;

async function fetchHtmlWithGuard(startUrl: URL): Promise<{ html: string; finalUrl: URL } | { error: string }> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; ExhibitionHallLinkPreview/1.0)",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return { error: "대상 사이트에 접속할 수 없어요" };
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { error: "리다이렉트 대상을 찾을 수 없어요" };
      const nextUrl = new URL(location, currentUrl);
      const check = checkUrlAllowed(nextUrl.toString());
      if (!check.allowed || !check.url) return { error: check.reason ?? "허용되지 않은 주소예요" };
      currentUrl = check.url;
      continue;
    }

    if (!response.ok || !response.body) {
      return { error: "대상 사이트에서 응답을 받지 못했어요" };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { error: "미리보기를 지원하지 않는 콘텐츠예요" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (received >= MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        break;
      }
    }
    return { html, finalUrl: currentUrl };
  }

  return { error: "리다이렉트가 너무 많아요" };
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ ok: false, error: "url 파라미터가 필요해요" }, { status: 400 });
  }

  const check = checkUrlAllowed(target);
  if (!check.allowed || !check.url) {
    return NextResponse.json({ ok: false, error: check.reason ?? "허용되지 않은 주소예요" }, { status: 400 });
  }

  const result = await fetchHtmlWithGuard(check.url);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  const parsed = parseOgTags(result.html);
  const resolve = (value: string | null) => {
    if (!value) return null;
    try {
      return new URL(value, result.finalUrl).toString();
    } catch {
      return null;
    }
  };

  return NextResponse.json({
    ok: true,
    url: result.finalUrl.toString(),
    domain: result.finalUrl.hostname,
    title: parsed.title,
    description: parsed.description,
    image: resolve(parsed.image),
    favicon: resolve(parsed.favicon) ?? `${result.finalUrl.origin}/favicon.ico`,
  });
}
