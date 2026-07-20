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
