"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Languages } from "lucide-react"
import { setLocale } from "@/app/locale-actions"
import { LOCALES, type Locale } from "@/config/i18n"

/**
 * PART C / Phase 11 — language switcher. Sets the locale cookie and refreshes;
 * the server resolves messages on the next render.
 */
export function LocaleSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-text-mid">
      {/* Decorative next to a labeled select — yields its ~20px on narrow
          headers so the wordmark keeps breathing room on one line. */}
      <Languages className="hidden size-3.5 sm:block" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={current}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setLocale(e.target.value)
            router.refresh()
          })
        }
        className="rounded border border-hairline bg-transparent px-1.5 py-0.5 text-xs"
      >
        {LOCALES.map((l) => (
          <option key={l.key} value={l.key}>
            {l.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
