import { ImageResponse } from "next/og"
import { brand } from "@/config/brand"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"

/**
 * Branded 1200x630 Open Graph card, generated per page.
 *
 * A single dynamic generator rather than Next's file-based `opengraph-image`
 * convention, deliberately: file-based metadata OVERRIDES the metadata object,
 * so a root opengraph-image.tsx would clobber every page's own card. This route
 * keeps one image per page title without 15 near-identical files.
 *
 * It lives at /og (not /api/og) because robots.ts disallows /api — crawlers
 * must be able to fetch the card.
 *
 * Usage: lib/seo.ts `ogImage(title)` builds the URL; buildMetadata() wires it
 * into openGraph.images + twitter.images.
 */
export const contentType = "image/png"

const OBSIDIAN = "#07080B"
const SURFACE = "#14171D"
const BRASS = "#C9A24B"
const BRASS_BRIGHT = "#E7C77A"
const TEXT_HI = "#F2F3F5"
const TEXT_MID = "#A8AEB8"

export async function GET(request: Request) {
  // SEC-14 — image synthesis is expensive; throttle per IP so an attacker can't
  // spray unique ?title= values to exhaust CPU. Crawlers hitting the handful of
  // real page cards stay well under this.
  if (!rateLimit(`og:${clientIpFrom(request.headers)}`, 30)) {
    return new Response("Too many requests", { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const title = (searchParams.get("title") ?? brand.tagline).slice(0, 110)
  const eyebrow = (searchParams.get("eyebrow") ?? "NYC · gun license, handled").slice(0, 60)
  // The brand mark, fetched from this origin (the dark-surface logo reads on the
  // obsidian card).
  const logoUrl = new URL("/logo.png", request.url).href

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: `linear-gradient(135deg, ${OBSIDIAN} 0%, ${SURFACE} 60%, ${OBSIDIAN} 100%)`,
        }}
      >
        {/* brass hairline top rule */}
        <div style={{ display: "flex", height: 3, width: 140, background: BRASS }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: BRASS_BRIGHT,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: title.length > 60 ? 62 : 78,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
              color: TEXT_HI,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* wordmark + seal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} width={50} height={59} alt="" style={{ objectFit: "contain" }} />
            <div
              style={{
                display: "flex",
                marginLeft: 16,
                fontSize: 30,
                fontWeight: 600,
                color: TEXT_HI,
              }}
            >
              {brand.name}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: TEXT_MID }}>{brand.domain}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // SEC-14 — let the CDN/browser cache the card so repeat fetches don't
      // re-synthesize the image (the inputs are stable per page title).
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable" },
    }
  )
}
