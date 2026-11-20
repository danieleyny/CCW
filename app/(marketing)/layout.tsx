import { JsonLd, organizationSchema, websiteSchema } from "@/components/marketing/json-ld"
import { MarketingFrame } from "@/components/marketing/v2/MarketingFrame"
import "./marketing-v2.css"
import "./hero-guided-path.css"

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
      <MarketingFrame>{children}</MarketingFrame>
    </>
  )
}
