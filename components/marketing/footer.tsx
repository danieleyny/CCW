import Link from "next/link"
import { brand } from "@/config/brand"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { LogoMark } from "@/components/brand/logo"
import { footerColumns } from "@/lib/marketing-routes"

/**
 * The footer is the hub of the hub-and-spoke: every new SEO page is reachable
 * from here, so nothing is an orphan and everything sits <=2 clicks from home.
 * Columns are derived from the single route registry (lib/marketing-routes), so
 * adding a page there automatically lists it here.
 */
const COLS = footerColumns()

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground"
            >
              <LogoMark className="size-8 text-brass" />
              {brand.logo.wordmark}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-text-mid">{brand.tagline}</p>
            <p className="mt-4 font-mono text-xs text-text-low">
              {brand.contact.email} · {brand.contact.phone} · {brand.contact.address}
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <SectionEyebrow>{col.title}</SectionEyebrow>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-mid transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-hairline pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
          <p className="mt-4 font-mono text-xs text-text-low">
            © {brand.legalName}
          </p>
        </div>
      </div>
    </footer>
  )
}
