import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"

export function MarketingFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt2">
      <SiteHeader />
      <main id="top">{children}</main>
      <SiteFooter />
    </div>
  )
}
