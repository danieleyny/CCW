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
   * Redirects. Three kinds:
   *
   * 1. Cannibalizing blog posts → their pillar (301). The .mdx files are deleted
   *    so nothing regenerates them; the pillar is the canonical home of the topic.
   * 2. www → apex, so the canonical host is always the bare gunlicensenyc.com.
   * 3. Keyword / brand-alias domains → the MATCHING page on the canonical site,
   *    NOT a microsite (Google penalizes doorway networks). Every rule is
   *    HOST-CONDITIONAL, so it only fires once that domain is actually attached to
   *    the Vercel project and no-ops until then — see DOMAIN_STRATEGY.md
   *    "Deployment". Brand aliases preserve the path; exact-match keyword domains
   *    send all their traffic to the single best-matching page.
   *
   * ⚠️ NEVER list a SATELLITE domain here. firearmlicensenyc.com and
   * nycgunlaws.com are independent deployments with their own Vercel projects;
   * they must not be attached to this project and must not appear in either list
   * below. They were briefly in BRAND_ALIAS_HOSTS, which 301'd them here — an
   * easy mistake to repeat, because Next runs redirects() before Proxy so the
   * 301 wins silently.
   */
  async redirects() {
    const CANONICAL = "gunlicensenyc.com"
    const host = (value: string) => ({ type: "host" as const, value })
    const withWww = (hosts: string[]) => hosts.flatMap((h) => [h, `www.${h}`])

    // Owned brand-variant domains → canonical, path-preserving. (concealedknowledge.*
    // is intentionally omitted — it's reserved to become a real content property,
    // not a redirect. See DOMAIN_STRATEGY.md.)
    const BRAND_ALIAS_HOSTS = ["gunlicenseny.com", "firearmlicenseny.com"]

    // Exact-match keyword domains → the matching page. Add a host here as you buy +
    // attach it in Vercel; unattached hosts simply never match. Mapping mirrors the
    // clusters in DOMAIN_STRATEGY.md.
    const KEYWORD_REDIRECTS: { target: string; hosts: string[] }[] = [
      // Training / course cluster → the requirements pillar (training section).
      { target: "/requirements", hosts: ["nycfirearmstraining.com", "nycguntraining.com", "guntrainingnyc.com", "nycccwcourse.com", "nyccarrycourse.com", "guntraining.nyc"] },
      // Renewal cluster → /renewal.
      { target: "/renewal", hosts: ["nycgunlicenserenewal.com", "gunlicenserenewalnyc.com", "nycpistolpermitrenewal.com"] },
      // Borough exact-match → that borough page.
      { target: "/gun-license/manhattan", hosts: ["manhattangunlicense.com"] },
      { target: "/gun-license/brooklyn", hosts: ["brooklyngunlicense.com"] },
      { target: "/gun-license/queens", hosts: ["queensgunlicense.com"] },
      { target: "/gun-license/bronx", hosts: ["bronxgunlicense.com"] },
      { target: "/gun-license/staten-island", hosts: ["statenislandgunlicense.com"] },
      // Premises cluster → the premises-vs-carry explainer.
      { target: "/premises-vs-carry", hosts: ["nycpremiseslicense.com", "premiseslicensenyc.com"] },
      // Handgun / carry-license / pistolpermit brand-type → home.
      { target: "/", hosts: ["nychandgunlicense.com", "handgunlicensenyc.com", "nychandgunpermit.com", "carrylicensenyc.com", "nycarrylicense.com", "nycfirearmlicense.com", "concealedcarryny.com", "pistolpermit.nyc", "gunlicense.nyc"] },
    ]

    return [
      // 1. cannibalizing posts → pillars
      { source: "/blog/nyc-ccw-requirements-2026", destination: "/requirements", permanent: true },
      { source: "/blog/how-long-does-nyc-ccw-take", destination: "/timeline", permanent: true },
      { source: "/blog/documents-you-need-for-nyc-ccw", destination: "/requirements", permanent: true },
      // 2. www → apex
      { source: "/:path*", has: [host(`www.${CANONICAL}`)], destination: `https://${CANONICAL}/:path*`, permanent: true },
      // 3a. brand aliases → canonical (path preserved)
      ...withWww(BRAND_ALIAS_HOSTS).map((h) => ({
        source: "/:path*",
        has: [host(h)],
        destination: `https://${CANONICAL}/:path*`,
        permanent: true,
      })),
      // 3b. keyword domains → matching page (all paths)
      ...KEYWORD_REDIRECTS.flatMap(({ target, hosts }) =>
        withWww(hosts).map((h) => ({
          source: "/:path*",
          has: [host(h)],
          destination: `https://${CANONICAL}${target}`,
          permanent: true,
        }))
      ),
    ]
  },
};

export default nextConfig;
