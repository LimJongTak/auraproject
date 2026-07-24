function isPrivateIPv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if ([a, b, Number(match[3]), Number(match[4])].some((n) => n > 255)) return false;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 unique local
  if (h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) {
    return true; // fe80::/10 link-local
  }
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded IPv4
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "metadata.google.internal"]);

export interface SsrfCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkUrlAllowed(rawUrl: string): { url: URL | null } & SsrfCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { url: null, allowed: false, reason: "올바른 URL이 아니에요" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { url, allowed: false, reason: "http/https 주소만 지원해요" };
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    return { url, allowed: false, reason: "허용되지 않은 주소예요" };
  }
  if (host.includes(":")) {
    if (isPrivateIPv6(host)) return { url, allowed: false, reason: "허용되지 않은 주소예요" };
  } else if (isPrivateIPv4(host)) {
    return { url, allowed: false, reason: "허용되지 않은 주소예요" };
  }

  return { url, allowed: true };
}
