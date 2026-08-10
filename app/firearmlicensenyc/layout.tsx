import type { Metadata } from "next"
import { SiteFooter, SiteHeader, styles } from "./components"
import { FIREARM_SITE } from "@/lib/firearm-license-site"

export const metadata: Metadata = {
  metadataBase: new URL(FIREARM_SITE.origin),
  title: { default: "NYC Firearm License Help | Firearm License NYC", template: "%s | Firearm License NYC" },
  description: "Clear, private guidance for NYC firearm license applicants across all five boroughs.",
  applicationName: FIREARM_SITE.name,
}

export default function FirearmLicenseLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.site}><SiteHeader /><main>{children}</main><SiteFooter /></div>
}
