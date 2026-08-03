"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { I18N_ES_ENABLED, hasSpanishTwin } from "@/config/i18n"

/**
 * SEO V2 Phase 5 — the ONLY entry point to the Spanish surface. No
 * Accept-Language auto-redirect (that's SEO poison and strips user choice); the
 * reader picks their language here. Rendered in the footer.
 *
 * Shows only when the Spanish surface is live (I18N_ES_ENABLED) AND the current
 * page has a translated twin — so it never dangles a link to a page that 404s.
 */
export function LangToggle() {
  const pathname = usePathname() || "/"
  if (!I18N_ES_ENABLED) return null

  const isEs = pathname === "/es" || pathname.startsWith("/es/")
  // The English path this page corresponds to ("" = home).
  const enPath = isEs
    ? pathname === "/es"
      ? ""
      : pathname.slice(3)
    : pathname === "/"
      ? ""
      : pathname

  if (!hasSpanishTwin(enPath)) return null

  const enHref = enPath === "" ? "/" : enPath
  const esHref = `/es${enPath}`

  return (
    <div className="flex items-center gap-2 text-xs" aria-label="Language">
      <Link
        href={enHref}
        hrefLang="en"
        className={isEs ? "text-text-low hover:text-signal" : "font-semibold text-text-hi"}
        aria-current={!isEs}
      >
        English
      </Link>
      <span className="text-text-low">·</span>
      <Link
        href={esHref}
        hrefLang="es"
        className={isEs ? "font-semibold text-text-hi" : "text-text-low hover:text-signal"}
        aria-current={isEs}
      >
        Español
      </Link>
    </div>
  )
}
