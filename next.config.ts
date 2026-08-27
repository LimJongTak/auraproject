import type { NextConfig } from "next";

// Every network call this app makes from the browser goes to Firebase
// (Auth/Firestore/Storage under *.googleapis.com, callable Functions under
// *.cloudfunctions.net/*.run.app), same-origin (/api/link-preview), or —
// only when App Check's reCAPTCHA v3 provider is configured, see
// src/lib/firebase/client.ts — Google's reCAPTCHA script/frame. No other
// third-party scripts/styles/fonts are loaded (next/font self-hosts), so the
// policy below can stay tight without a nonce.
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://firebasestorage.googleapis.com;
  font-src 'self';
  connect-src 'self' https://*.googleapis.com https://*.cloudfunctions.net https://*.run.app;
  frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
