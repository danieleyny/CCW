import type { Metadata } from "next"
import { brand } from "@/config/brand"

/**
 * SEO origin + metadata helper — the single source of truth for every
 * canonical-bearing surface (page metadata, sitemap, robots, llms.txt, OG URLs).
 *
 * WHY THIS EXISTS: three different origins used to be in play at once —
 * `metadataBase` hardcoded `brand.url`, sitemap/robots read
 * `NEXT_PUBLIC_SITE_URL ?? brand.url`, and `lib/site-url.ts` falls back to the
 * old vercel.app host. That meant a preview deploy could emit sitemap URLs on
 * one host while canonicals resolved to another. Canonical identity must never
 * depend on which box rendered the page, so SEO surfaces always use the real
 * public domain from `config/brand.ts`.
 *
 * `getSiteUrl()` (lib/site-url.ts) is deliberately NOT reused here: that one is
 * for runtime links in emails, which SHOULD point at the deploy that sent them.
 */
export const CANONICAL_ORIGIN = brand.url.replace(/\/$/, "")

/** Absolute, canonical URL for a route. `path` must start with "/" (or be ""). */
export function canonical(path: string): string {
  if (!path || path === "/") return CANONICAL_ORIGIN
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${CANONICAL_ORIGIN}${clean.replace(/\/$/, "")}`
}

/** Only the real production deploy should be indexable — never previews. */
export function isIndexableEnv(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === undefined
}

/** Branded OG image URL for a page (see app/og/route.tsx). */
export function ogImage(title: string, eyebrow?: string): string {
  const p = new URLSearchParams({ title })
  if (eyebrow) p.set("eyebrow", eyebrow)
  return `${CANONICAL_ORIGIN}/og?${p.toString()}`
}

/**
 * Build a complete, per-page Metadata object: title, description, canonical,
 * Open Graph and Twitter — so no page has to hand-roll (and forget) them.
 * `title` is passed bare and picks up the root template `%s · Gun License NYC`.
 */
export function buildMetadata({
  title,
  description,
  path,
  type = "website",
  ogTitle,
  noIndex = false,
}: {
  /** Keyword-led, <= 60 chars including the " · Gun License NYC" suffix. */
  title: string
  /** <= 155 chars, benefit + keyword, genuinely distinct per page. */
  description: string
  /** Route path, e.g. "/cost". */
  path: string
  type?: "website" | "article"
  /** Full title for the OG card (the template isn't applied to OG). */
  ogTitle?: string
  noIndex?: boolean
}): Metadata {
  const url = canonical(path)
  const social = ogTitle ?? `${title} · ${brand.name}`
  const image = ogImage(title)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: social,
      description,
      url,
      siteName: brand.name,
      locale: "en_US",
      type,
      images: [{ url: image, width: 1200, height: 630, alt: social }],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [image],
    },
    ...(noIndex || !isIndexableEnv() ? { robots: { index: false, follow: false } } : {}),
  }
}
