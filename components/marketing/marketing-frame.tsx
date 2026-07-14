"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"
import { LightBackdrop } from "@/components/theme/light-backdrop"

/**
 * V5 — the homepage ("/") runs the cinematic DARK register; every other
 * marketing route stays on warm paper, unchanged. The theme choice is scoped
 * HERE by pathname (not in the layout wholesale) so /pricing, /faq,
 * /how-it-works, /blog, /eligibility, /contact render exactly as before.
 *
 * nav + footer are passed in as already-rendered server elements so they stay
 * server components; the .dark class on the wrapper re-themes the whole subtree
 * (nav, page, footer) via cascading CSS vars — no runtime toggle.
 */
export function MarketingFrame({
  nav,
  footer,
  children,
}: {
  nav: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const isHome = usePathname() === "/"
  return (
    <div
      className={cn(
        "flex min-h-svh flex-col",
        isHome && "dark bg-background text-foreground"
      )}
    >
      {isHome ? <DarkBackdrop /> : <LightBackdrop />}
      {nav}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  )
}
