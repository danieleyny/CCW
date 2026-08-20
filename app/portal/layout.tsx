import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { shouldForceIntake } from "@/lib/portal/intake-gate"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
import { PortalTopNav, PortalBottomNav } from "@/components/portal/portal-nav"
import { AccountActions } from "@/components/auth/account-actions"
import { NotificationBell } from "@/components/shared/notification-bell"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"
import { LocaleSwitcher } from "@/components/shared/locale-switcher"
import { getLocale, getMessages } from "@/lib/i18n"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(["client"])

  // Soft intake gate — carry a brand-new applicant into intake before they can
  // wander a half-empty portal. Gentle: only early-stage + intake-incomplete
  // cases, and intake/profile/privacy + attorney-review cases are exempt.
  const pathname = (await headers()).get("x-pathname") ?? ""
  const myCase = await getMyCase()
  if (myCase && (await shouldForceIntake(pathname, myCase))) {
    redirect("/portal/intake")
  }

  // Unread count for the bottom-nav "More" pill (Messages lives there on mobile).
  // RLS-scoped to this user, same source the NotificationBell reads.
  const supabase = await createClient()
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false)

  const [locale, t] = await Promise.all([getLocale(), getMessages()])
  // CONCIERGE QA Phase 4 — the done-for-you path gets its own nav (no checklist).
  const isConcierge = myCase?.service_mode === "concierge"

  return (
    <div
      className="dark flex min-h-svh flex-col bg-background text-foreground"
      // The tab bar's height, exposed so pages with their own sticky action bar
      // (intake) can extend their bottom padding past it.
      style={{ "--shell-bottom": "calc(60px + env(safe-area-inset-bottom))" } as React.CSSProperties}
    >
      <DarkBackdrop />
      <header
        className="glass-bar sticky top-0 z-20 border-b border-hairline"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:h-16">
          {/* The wordmark never wraps: at 390px the language selector squeezed
              it onto three lines, so the lockup shrinks a step instead. */}
          <Link href="/portal" className="flex items-center gap-2 whitespace-nowrap font-display text-[15px] font-semibold tracking-tight text-foreground sm:text-lg">
            <LogoMark className="size-7 shrink-0 text-brass sm:size-8" />
            {brand.logo.wordmark}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher current={locale} label={t.common.language} />
            <NotificationBell />
            <Link
              href="/portal/profile"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              {profile.full_name}
            </Link>
            <AccountActions signOutLabel={t.common.signOut} />
          </div>
        </div>
        <PortalTopNav concierge={isConcierge} />
      </header>

      {/* Single bottom pad: clear the tab bar (var --shell-bottom) plus breathing
          room. The old layout applied pb-24 on BOTH main and footer, doubling it.
          On intake the tab bar is hidden and the wizard's own sticky action bar
          carries the safe area, so we don't reserve tab-bar space there. */}
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:pb-8 ${
          pathname.startsWith("/portal/intake") ? "pb-0" : "pb-[calc(var(--shell-bottom)+24px)]"
        }`}
      >
        {children}
      </main>

      {/* Desktop only — on mobile these live in the More sheet (Profile & your data). */}
      <footer className="mx-auto hidden w-full max-w-3xl gap-4 px-4 pb-6 text-xs text-text-low md:flex">
        <Link href="/portal/profile" className="underline hover:text-text-mid">
          Profile
        </Link>
        <Link href="/portal/privacy" className="underline hover:text-text-mid">
          {t.portal.yourData}
        </Link>
      </footer>

      {/* Intake is a focused task flow with its own sticky action bar — two
          stacked bottom bars is one too many. The soft intake gate already keeps
          a new applicant here, and the wizard has a "Save & exit" out. */}
      {!pathname.startsWith("/portal/intake") && (
        <PortalBottomNav unread={unread ?? 0} concierge={isConcierge} />
      )}
    </div>
  )
}
