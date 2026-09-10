import Link from "next/link"
import { NAV_ROUTES } from "@/lib/marketing-routes"

/**
 * Marketing v2 header — a floating pill nav (see marketing-v2.css). Server
 * component: the mobile menu is a native <details>, so it opens and closes with
 * NO JavaScript (VERIFY #2). Links come from the route registry so nothing is
 * orphaned. The brand mark is CSS-drawn (the spectral bar), no image.
 */
export function SiteHeader() {
  const links = NAV_ROUTES // [{ href, label }] — nav:true routes
  return (
    <header className="site-header">
      <div className="shell nav-row">
        <Link className="brand" href="/" aria-label="Gun License NYC home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Gun License NYC</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link className="sign-in" href="/auth/login">
            Sign in
          </Link>
          <Link className="button" href="/eligibility">
            Check eligibility <span className="button-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">
            <span className="menu-glyph" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </summary>
          <div className="mobile-menu-panel">
            <nav aria-label="Mobile navigation">
              {links.map((l, i) => (
                <Link key={l.href} href={l.href}>
                  {l.label} <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              ))}
              <Link href="/auth/login">
                Client sign in <span aria-hidden="true">↗</span>
              </Link>
            </nav>
            <Link className="button button-light" href="/eligibility">
              Check eligibility <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
            <p className="mobile-menu-note">Two minutes · no card required</p>
          </div>
        </details>
      </div>
    </header>
  )
}
