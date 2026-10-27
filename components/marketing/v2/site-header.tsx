"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { CSSProperties } from "react"
import { NAV_ROUTES } from "@/lib/marketing-routes"
import BrandLogo from "@/components/brand/BrandLogo"
import { usePlayOncePerLoad } from "@/components/marketing/shared/usePlayOncePerLoad"

/**
 * Marketing v2 header — a floating pill nav (see marketing-v2.css). Server
 * component: the mobile menu is a native <details>, so it opens and closes with
 * Links come from the route registry so nothing is orphaned. The native details
 * element keeps the mobile drawer lightweight while the brand lock-on stays in
 * the persistent header only.
 */
export function SiteHeader() {
  const links = NAV_ROUTES // [{ href, label }] — nav:true routes
  const playIntro = usePlayOncePerLoad("header")

  return (
    <header className="site-header">
      <div className="shell nav-row headerBar" data-intro={playIntro ? "play" : undefined}>
        <BrandLogo tone="ink" size="md" motion="live" responsiveHeader className="brand" />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((l, index) => (
            <Link key={l.href} href={l.href} className="navItem" style={{ "--i": index } as CSSProperties}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link className="sign-in navItem" href="/auth/login" style={{ "--i": links.length } as CSSProperties}>
            Sign in
          </Link>
          <Link className="button navItem" href="/eligibility" style={{ "--i": links.length + 1 } as CSSProperties}>
            Check eligibility <span className="button-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <details className="mobile-menu">
          <summary className="navItem" style={{ "--i": 0 } as CSSProperties} aria-label="Open navigation menu">
            <span className="menu-glyph" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </summary>
          <div className="mobile-menu-panel">
            <div className="mobile-menu-brand"><BrandLogo tone="light" size="sm" motion="none" /></div>
            <nav aria-label="Mobile navigation">
              {links.map((l, i) => (
                <Link key={l.href} href={l.href}>
                  {l.label} <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              ))}
              <Link href="/auth/login" className="inline-flex items-center gap-1.5">
                Client sign in <ExternalLink className="size-3.5" aria-hidden />
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
