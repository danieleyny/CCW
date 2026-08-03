/**
 * PART C / Phase 11 — internationalization foundation.
 *
 * NYC is one of the most multilingual places in the country, and this is a
 * high-anxiety, legal process — meeting an applicant in their language matters.
 * This ships the FRAMEWORK plus one additional language (Spanish); more
 * languages are added by extending the catalogs (lib/i18n/messages).
 *
 * ⚖ A deliberate constraint the whole design enforces: LEGAL-BEARING text — the
 * standing NYPD-discretion disclaimer, candor language, anything that states a
 * rule — is NOT machine-translated. Those keys are marked `reviewNeeded` and
 * fall back to the reviewed English until a native-fluent attorney signs off on
 * a translation. Getting a firearms-law disclaimer subtly wrong in translation
 * is worse than showing it in English.
 */
export const LOCALES = [
  { key: "en", label: "English", nativeLabel: "English" },
  { key: "es", label: "Spanish", nativeLabel: "Español" },
] as const

export type Locale = (typeof LOCALES)[number]["key"]

export const DEFAULT_LOCALE: Locale = "en"

/** Cookie the chosen locale is stored under. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && LOCALES.some((l) => l.key === v)
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO V2 Phase 5 — URL-prefixed /es routes (distinct from the cookie catalog
// above, which localizes app UI). This is the PUBLIC, indexable Spanish surface:
// a small set of translated money pages under /es, with hreflang wiring.
//
// The whole surface is gated behind ONE flag so it can ship DARK while a native-
// fluent reviewer checks the copy: with it off, /es routes 404, no hreflang is
// emitted, and the language toggle is hidden. No Accept-Language auto-redirect
// (SEO poison) — the toggle is the only entry point.
// ─────────────────────────────────────────────────────────────────────────────

/** Master switch for the public /es surface. Off → ships dark. */
export const I18N_ES_ENABLED = process.env.NEXT_PUBLIC_I18N_ES === "true"

/**
 * The ENGLISH paths that have a Spanish twin at `/es` + path ("" = home).
 * Only these emit hreflang and appear in the toggle/sitemap alternates.
 */
export const TRANSLATED_PATHS = ["", "/cost", "/requirements", "/timeline", "/how-it-works"] as const

export function hasSpanishTwin(path: string): boolean {
  return (TRANSLATED_PATHS as readonly string[]).includes(path)
}
