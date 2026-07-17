import { ImageResponse } from "next/og"
import { brand } from "@/config/brand"

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
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get("title") ?? brand.tagline).slice(0, 110)
  const eyebrow = (searchParams.get("eyebrow") ?? "NYC · gun license, handled").slice(0, 60)

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
            <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke={BRASS} strokeWidth="1.8" />
              <circle cx="24" cy="24" r="17.5" stroke={BRASS} strokeWidth="0.7" opacity="0.45" />
              <g fill={BRASS}>
                <rect x="13" y="25" width="3" height="6" />
                <rect x="16.5" y="20" width="3" height="11" />
                <rect x="20" y="13" width="3.5" height="18" />
                <rect x="24" y="17" width="3" height="14" />
                <rect x="27.5" y="22" width="3" height="9" />
                <rect x="31" y="25.5" width="3" height="5.5" />
              </g>
              <line x1="9" y1="31" x2="39" y2="31" stroke={BRASS} strokeWidth="1.6" />
            </svg>
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
    { width: 1200, height: 630 }
  )
}
