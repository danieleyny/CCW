import { cookies } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/config/i18n"
import { CATALOGS, SOURCE, type Messages } from "@/lib/i18n/messages"

/**
 * PART C / Phase 11 — resolve the request's locale and its messages.
 *
 * A locale's catalog is overlaid on the complete English source, so any key the
 * translation hasn't covered (including every legal key) resolves to reviewed
 * English rather than a blank. `cookies()` is async in this Next.js.
 */
export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE
}

/** Deep-merge a partial locale catalog over the complete English source. */
function merge(locale: Locale): Messages {
  const overlay = CATALOGS[locale] ?? {}
  const out = {} as Messages
  for (const section of Object.keys(SOURCE) as (keyof Messages)[]) {
    out[section] = { ...SOURCE[section], ...(overlay[section] ?? {}) } as never
  }
  return out
}

/** The resolved messages for the current request. */
export async function getMessages(): Promise<Messages> {
  return merge(await getLocale())
}
