"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Locale } from "@/config/i18n"
import { SOURCE, type Messages } from "@/lib/i18n/messages"
export { interpolate } from "@/lib/i18n/interpolate"

type PortalI18nValue = {
  locale: Locale
  messages: Messages
}
const PortalI18nContext = createContext<PortalI18nValue | null>(null)

export function PortalI18nProvider({
  locale,
  messages,
  children,
}: PortalI18nValue & { children: ReactNode }) {
  return (
    <PortalI18nContext value={{ locale, messages }}>
      {children}
    </PortalI18nContext>
  )
}

export function usePortalI18n(): PortalI18nValue {
  const value = useContext(PortalI18nContext)
  // Shared widgets (for example MessageThread) also render in the admin and
  // instructor shells. Those surfaces have not opted into portal localization,
  // so they intentionally receive the complete English source catalog.
  return value ?? { locale: "en", messages: SOURCE }
}
