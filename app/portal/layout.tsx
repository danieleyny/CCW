import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { resolveOnboardingRedirect } from "@/lib/portal/intake-gate"
import BrandLogo from "@/components/brand/BrandLogo"
import { PortalTopNav, PortalBottomNav } from "@/components/portal/portal-nav"
import { AccountActions } from "@/components/auth/account-actions"
import { NotificationBell } from "@/components/shared/notification-bell"
import { LocaleSwitcher } from "@/components/shared/locale-switcher"
import { getLocale, getMessages } from "@/lib/i18n"
import { PortalI18nProvider } from "@/components/shared/portal-i18n-provider"
import { User } from "lucide-react"
import "./portal-v2.css"

function getInitials(name: string | null) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return initials || null
}

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
  if (myCase) {
    const onboardingRedirect = await resolveOnboardingRedirect(pathname, myCase)
    if (onboardingRedirect) redirect(onboardingRedirect)
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
  const initials = getInitials(profile.full_name)

  return (
    <PortalI18nProvider locale={locale} messages={t}>
    <div
      lang={locale}
      className="portal-v2 flex min-h-svh flex-col bg-background text-foreground"
      // The tab bar's height, exposed so pages with their own sticky action bar
      // (intake) can extend their bottom padding past it.
      style={{ "--shell-bottom": "calc(60px + env(safe-area-inset-bottom))" } as React.CSSProperties}
    >
      <header
        className="portal-v2-header sticky top-0 z-40 border-b border-hairline"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="portal-v2-header-inner mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* The wordmark never wraps: at 390px the language selector squeezed
              it onto three lines, so the lockup shrinks a step instead. */}
          <BrandLogo href="/portal" tone="ink" size="sm" accessibleLabel={null} />
          <div className="portal-v2-header-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher current={locale} label={t.common.language} />
            <NotificationBell locale={locale} messages={t.ui} />
            <Link
              href="/portal/profile"
              className="portal-v2-avatar md:hidden"
            >
              {initials ? <span aria-hidden>{initials}</span> : <User aria-hidden />}
              <span className="sr-only">{profile.full_name || t.common.account} · {t.common.profile}</span>
            </Link>
            <Link
              href="/portal/profile"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline"
            >
              {profile.full_name}
            </Link>
            <div className="hidden md:block">
              <AccountActions signOutLabel={t.common.signOut} switchLabel={t.ui.switchAccount} />
            </div>
          </div>
        </div>
            <PortalTopNav concierge={isConcierge} />
      </header>

      {/* Single bottom pad: clear the tab bar (var --shell-bottom) plus breathing
          room. The old layout applied pb-24 on BOTH main and footer, doubling it.
          On intake the tab bar is hidden and the wizard's own sticky action bar
          carries the safe area, so we don't reserve tab-bar space there. */}
      <main
        className={`mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6 md:pb-10 lg:px-8 lg:py-11 ${
          pathname.startsWith("/portal/intake") ? "pb-0" : "pb-[calc(var(--shell-bottom)+24px)]"
        }`}
      >
        {children}
      </main>

      {/* Desktop only — on mobile these live in the More sheet (Profile & your data). */}
      <footer className="mx-auto hidden w-full max-w-[1120px] gap-4 px-6 pb-7 text-xs text-text-low md:flex lg:px-8">
        <Link href="/portal/profile" className="underline hover:text-text-mid">
          {t.common.profile}
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
    </PortalI18nProvider>
  )
}
