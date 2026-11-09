"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { CSSProperties } from "react"
import { NAV_ROUTES } from "@/lib/marketing-routes"
import BrandLogo from "@/components/brand/BrandLogo"
import { usePlayOncePerLoad } from "@/components/marketing/shared/usePlayOncePerLoad"
import { useEffect, useRef, useState } from "react"

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
  const headerRef = useRef<HTMLElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-header='dark']"))
    const visible = new Set<HTMLElement>()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target as HTMLElement) : visible.delete(entry.target as HTMLElement))
      const headerBottom = header.getBoundingClientRect().bottom
      setIsDark([...visible].some((section) => {
        const rect = section.getBoundingClientRect()
        return rect.top <= headerBottom && rect.bottom >= 20
      }))
    }, { rootMargin: "-12px 0px -82% 0px", threshold: 0 })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <header ref={headerRef} className="site-header" data-tone={isDark ? "dark" : "light"}>
      <div className="shell nav-row headerBar" data-intro={playIntro ? "play" : undefined}>
        <BrandLogo tone="ink" size="md" motion="live" responsiveHeader className="brand" />

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.flatMap((l) => l.label === "How it works" ? [l, { href: "/#training", label: "Training" }] : [l]).map((l, index) => (
            <Link key={l.href} href={l.href} className="navItem" style={{ "--i": index } as CSSProperties}>{l.label}</Link>
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
              <Link href="/#training">Training <span aria-hidden="true">07</span></Link>
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
