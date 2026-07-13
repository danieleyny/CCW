import { MarketingNav } from "@/components/marketing/nav"
import { MarketingFooter } from "@/components/marketing/footer"
import { JsonLd, localBusinessSchema } from "@/components/marketing/json-ld"
import { LightBackdrop } from "@/components/theme/light-backdrop"

/**
 * V3-P4.1 — restraint pass: BootIntro (fake "CALIBRATING OPTICS" splash) and
 * CursorReticle (crosshair cursor) deleted. The buyer is a nervous first-time
 * applicant paying for legal-compliance help — the register is "my lawyer's
 * office," not a HUD. The design system itself is untouched.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <LightBackdrop />
      <JsonLd data={localBusinessSchema} />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
