import type { Metadata } from "next"
import { Newsreader } from "next/font/google"
import { SiteFooter, SiteHeader, styles } from "./components"
import { LAWS_SITE } from "@/lib/gun-laws-site"

/**
 * The serif is the whole identity here, so it is loaded on this route tree only
 * — the main app never pays for it. next/font self-hosts, which keeps it inside
 * the app's `font-src 'self' data:` CSP without a policy change.
 *
 * Newsreader is a variable font, so `weight` is deliberately omitted: that ships
 * two files (roman + italic) covering the full 200–700 axis instead of eight
 * static instances, and the design uses 300–600 across headings, body and
 * marginalia.
 */
const fontSerif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(LAWS_SITE.origin),
  title: {
    default: `${LAWS_SITE.name} — ${LAWS_SITE.tagline}`,
    template: `%s · ${LAWS_SITE.name}`,
  },
  description:
    "A plain-English, citation-backed reference to New York City firearm law: where you cannot carry, who qualifies for a license, what the penalties are, and what the courts have changed.",
  applicationName: LAWS_SITE.name,
  alternates: { canonical: LAWS_SITE.origin },
}

export default function LawsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fontSerif.variable} ${styles.site}`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
