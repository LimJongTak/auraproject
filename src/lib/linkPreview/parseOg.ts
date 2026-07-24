export interface ParsedOg {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

function extractMetaContent(html: string, matcher: RegExp): string | null {
  const tagRegex = /<meta\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(html))) {
    const tag = tagMatch[0];
    if (!matcher.test(tag)) continue;
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (contentMatch) return decodeEntities(contentMatch[1]);
  }
  return null;
}

function findOgOrTwitter(html: string, key: "title" | "description" | "image"): string | null {
  const og = extractMetaContent(html, new RegExp(`property\\s*=\\s*["']og:${key}["']`, "i"));
  if (og) return og;
  return extractMetaContent(html, new RegExp(`name\\s*=\\s*["']twitter:${key}["']`, "i"));
}

function findTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]) : null;
}

function findIcon(html: string): string | null {
  const linkRegex = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let fallback: string | null = null;
  while ((m = linkRegex.exec(html))) {
    const tag = m[0];
    if (!/rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']*)["']/i);
    if (!href) continue;
    if (/apple-touch-icon/i.test(tag)) {
      fallback = fallback ?? href[1];
      continue;
    }
    return href[1];
  }
  return fallback;
}

export function parseOgTags(html: string): ParsedOg {
  return {
    title: findOgOrTwitter(html, "title") ?? findTitleTag(html),
    description: findOgOrTwitter(html, "description"),
    image: findOgOrTwitter(html, "image"),
    favicon: findIcon(html),
  };
}
