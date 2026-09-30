import { Bodoni_Moda, Hanken_Grotesk, Azeret_Mono } from "next/font/google"
import { JsonLd, organizationSchema, websiteSchema } from "@/components/marketing/json-ld"
import { SiteHeader } from "@/components/marketing/v2/site-header"
import { SiteFooter } from "@/components/marketing/v2/site-footer"
import "./marketing-v2.css"
import "./hero-journey.css"

/**
 * MARKETING v2 frame (redesign/v2). The whole marketing surface runs the new
 * ivory/electric editorial system from redesign/homepage-visual-spec.html, scoped
 * under `.mkt2` (see marketing-v2.css) so it never touches the portal/admin/
 * instructor obsidian theme. config/brand.ts is untouched — this palette lives
 * only in the scoped stylesheet and these fonts.
 *
 * Fonts are the spec's three families, loaded via next/font (no render-blocking
 * external stylesheet) and mapped onto --display/--sans/--mono inside the scope.
 */
const display = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})
const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})
const mono = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
})

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* One @graph across the marketing surface: Organization + WebSite by @id. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organizationSchema, websiteSchema],
        }}
      />
      <div className={`mkt2 ${display.variable} ${sans.variable} ${mono.variable}`}>
        <SiteHeader />
        <main id="top">{children}</main>
        <SiteFooter />
      </div>
    </>
  )
}
