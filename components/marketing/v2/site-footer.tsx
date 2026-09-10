import Link from "next/link"
import { brand } from "@/config/brand"
import { footerColumns } from "@/lib/marketing-routes"

/**
 * Marketing v2 footer — the hub of the hub-and-spoke. Columns are derived from the
 * route registry (footerColumns), so every marketing page is linked here and nothing
 * is orphaned (VERIFY #8). The legal disclaimer is brand.disclaimer verbatim — load-
 * bearing compliance copy, never edited.
 */
const COLS = footerColumns()

export function SiteFooter() {
  return (
    <footer className="site-footer" id="portal">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-intro">
            <Link className="brand" href="/" aria-label="Gun License NYC home">
              <span className="brand-mark" aria-hidden="true" />
              <span>Gun License NYC</span>
            </Link>
            <p>{brand.tagline}</p>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} className="footer-col" aria-label={`${col.title} links`}>
              <h3>{col.title}</h3>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-legal">
          <p>{brand.disclaimer}</p>
        </div>
        <div className="footer-bottom">
          <span>© {brand.legalName}</span>
          <span>
            {brand.contact.email} · {brand.contact.phone}
          </span>
          <span>{brand.contact.address}</span>
        </div>
      </div>
    </footer>
  )
}
