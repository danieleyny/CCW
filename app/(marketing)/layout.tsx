import { MarketingNav } from "@/components/marketing/nav"
import { MarketingFooter } from "@/components/marketing/footer"
import { JsonLd, localBusinessSchema } from "@/components/marketing/json-ld"
import { BootIntro } from "@/components/marketing/boot-intro"
import { CursorReticle } from "@/components/marketing/cursor-reticle"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <JsonLd data={localBusinessSchema} />
      <BootIntro />
      <CursorReticle />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
