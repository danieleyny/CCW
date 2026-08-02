import type { NextConfig } from "next";

/**
 * SEC-09 — security response headers, applied to every route.
 *
 * The app shipped with NO security headers. This adds the standard hardening set
 * plus a Content-Security-Policy. The CSP is deliberately compatible (it keeps
 * 'unsafe-inline' for scripts/styles because the app doesn't nonce Next's inline
 * bootstrap) while still shutting the high-value doors: object-src/base-uri are
 * locked, the page can't be framed (clickjacking), forms can only post to us (+
 * Stripe Checkout), and connect/img/media are allow-listed to the origins we
 * actually use (Supabase, Google Analytics). Dev adds eval + ws + the local
 * Supabase origin so HMR and `pnpm dev` keep working.
 */
const isDev = process.env.NODE_ENV !== "production"

const csp = [
  `default-src 'self'`,
  // Next injects an inline bootstrap; GA injects an inline gtag snippet. Dev needs eval for HMR.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `media-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `form-action 'self' https://checkout.stripe.com`,
  `frame-src 'self' https://checkout.stripe.com`,
  // Supabase (REST + realtime), Google Analytics, and — in dev — local Supabase + HMR sockets.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://analytics.google.com${
    isDev ? " http://127.0.0.1:54321 http://localhost:* ws://127.0.0.1:* ws://localhost:*" : ""
  }`,
  `upgrade-insecure-requests`,
]
  .filter(Boolean)
  .join("; ")
  .replace(/\s+/g, " ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
]

const nextConfig: NextConfig = {
  experimental: {
    // The public reference page uploads a notarized PDF/scan through a server
    // action (anonymous users can't write Storage directly), so allow up to ~6MB.
    serverActions: { bodySizeLimit: "6mb" },
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },

  /**
   * Blog posts that cannibalized the pillar pages. Three early posts covered the
   * same queries as /requirements and /timeline, competing with them for the same
   * terms and splitting the signal. The pillars win: each post 301s to the page
   * that superseded it, and the .mdx files are deleted so nothing regenerates
   * them (getAllPosts() reads the directory, so the sitemap and blog index drop
   * them automatically — do not hand-edit app/sitemap.ts).
   *
   * These are permanent on purpose: the posts are gone, the pillar is the
   * canonical home of the topic, and the redirect passes their equity along.
   */
  async redirects() {
    return [
      { source: "/blog/nyc-ccw-requirements-2026", destination: "/requirements", permanent: true },
      { source: "/blog/how-long-does-nyc-ccw-take", destination: "/timeline", permanent: true },
      { source: "/blog/documents-you-need-for-nyc-ccw", destination: "/requirements", permanent: true },
    ]
  },
};

export default nextConfig;
