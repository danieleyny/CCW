"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Globe, Languages } from "lucide-react"
import { setLocale } from "@/app/locale-actions"
import { LOCALES, type Locale } from "@/config/i18n"

/**
 * PART C / Phase 11 — language switcher. Sets the locale cookie and refreshes;
 * the server resolves messages on the next render.
 */
export function LocaleSwitcher({
  current,
  label,
  variant = "header",
}: {
  current: Locale
  label: string
  variant?: "header" | "tile"
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const currentLanguage = LOCALES.find((item) => item.key === current)?.nativeLabel ?? current

  function changeLocale(value: string) {
    start(async () => {
      await setLocale(value)
      router.refresh()
    })
  }

  if (variant === "tile") {
    return (
      <label className="profile-shortcut profile-language-tile">
        <span className="profile-shortcut-icon" aria-hidden>
          <Globe />
        </span>
        <span className="profile-shortcut-copy">
          <strong>{label}</strong>
          <small>{currentLanguage}</small>
        </span>
        <ChevronDown className="profile-language-chevron" aria-hidden />
        <select
          aria-label={`Language: ${currentLanguage}, change`}
          value={current}
          disabled={pending}
          onChange={(event) => changeLocale(event.target.value)}
        >
          {LOCALES.map((locale) => (
            <option key={locale.key} value={locale.key}>
              {locale.nativeLabel}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="portal-locale-switcher inline-flex items-center gap-1.5 text-xs text-text-mid">
      {/* Decorative next to a labeled select — yields its ~20px on narrow
          headers so the wordmark keeps breathing room on one line. */}
      <Languages className="hidden size-3.5 sm:block" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={current}
        disabled={pending}
        onChange={(event) => changeLocale(event.target.value)}
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
