"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { LOCALE_COOKIE, isLocale } from "@/config/i18n"

/** PART C / Phase 11 — persist the chosen locale (a year-long cookie). */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  revalidatePath("/", "layout")
}
