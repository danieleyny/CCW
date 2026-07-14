import { MarketingNav } from "@/components/marketing/nav"
import { MarketingFooter } from "@/components/marketing/footer"
import { JsonLd, localBusinessSchema } from "@/components/marketing/json-ld"
import { MarketingFrame } from "@/components/marketing/marketing-frame"

/**
 * V3-P4.1 — restraint pass: BootIntro (fake "CALIBRATING OPTICS" splash) and
 * CursorReticle (crosshair cursor) deleted. The register is "my lawyer's
 * office," not a HUD.
 *
 * V5 — the backdrop + theme choice is scoped per route inside MarketingFrame:
 * the homepage ("/") runs the cinematic dark register, every other marketing
 * route stays on warm paper exactly as before.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <MarketingFrame nav={<MarketingNav />} footer={<MarketingFooter />}>
        {children}
      </MarketingFrame>
    </>
  )
}
