import path from "node:path";
import type { NextConfig } from "next";

// This app lives inside the storefront repository; pin the project root so
// Next.js never resolves the storefront's files (e.g. its proxy.js).
const projectRoot = path.resolve(process.cwd());

// The Supabase project the browser talks to (auth, storage uploads, signed image URLs).
function supabaseOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
}
const supabase = supabaseOrigin();
const supabaseSocket = supabase.replace(/^http/, "ws");

// Scripts: only this site. 'unsafe-inline' stays because Next.js and the theme
// switcher inject small inline scripts; a nonce-based policy is the next step.
// Anything loaded from another site (scripts, frames, form targets) is refused.
const contentSecurityPolicy = [
  "default-src 'self'",
  // The development server needs eval for fast refresh; production builds do not.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseSocket}`.trim(),
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
