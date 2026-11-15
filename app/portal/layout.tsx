import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { resolveOnboardingRedirect } from "@/lib/portal/intake-gate"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
import { PortalBottomNav, PortalDesktopNav } from "@/components/portal/portal-nav"
import { AccountActions } from "@/components/auth/account-actions"
import { NotificationBell } from "@/components/shared/notification-bell"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"
import { LocaleSwitcher } from "@/components/shared/locale-switcher"
import { getLocale, getMessages } from "@/lib/i18n"
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types"
import "./portal-v2.css"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(["client"])

  // Soft intake gate — carry a brand-new applicant into intake before they can
  // wander a half-empty portal. Gentle: only early-stage + intake-incomplete
  // cases, and intake/profile/privacy + attorney-review cases are exempt.
  const [headerList, myCase, locale, t] = await Promise.all([
    headers(),
    getMyCase(),
    getLocale(),
    getMessages(),
  ])
  const pathname = headerList.get("x-pathname") ?? ""
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

  // CONCIERGE QA Phase 4 — the done-for-you path gets its own nav (no checklist).
  const isConcierge = myCase?.service_mode === "concierge"
  const applicationType = myCase?.application_type as ApplicationType | null | undefined
  const applicationLabel = applicationType
    ? APPLICATION_TYPE_LABELS[applicationType]
    : "Application setup"

  return (
    <div
      className="portal-v2 dark min-h-svh bg-background text-foreground"
      // The tab bar's height, exposed so pages with their own sticky action bar
      // (intake) can extend their bottom padding past it.
      style={{ "--shell-bottom": "calc(60px + env(safe-area-inset-bottom))" } as React.CSSProperties}
    >
      <DarkBackdrop />
      <aside className="portal-v2__rail" aria-label="Case navigation">
        <Link href="/portal" className="portal-v2__brand">
          <LogoMark className="size-9 shrink-0" />
          <span>
            <strong>{brand.logo.wordmark}</strong>
            <small>Private case management</small>
          </span>
        </Link>

        <div className="portal-v2__caseplate">
          <p>Case / NYC</p>
          <h2>{applicationLabel}</h2>
          <div>
            <span className="portal-v2__case-dot" aria-hidden="true" />
            {isConcierge ? "Full Concierge" : "Applicant workspace"}
          </div>
        </div>

        <PortalDesktopNav concierge={isConcierge} />

        <div className="portal-v2__rail-note">
          <p>Applicant controlled</p>
          <span>You review and submit your own application. We keep the case organized.</span>
        </div>
      </aside>

      <div className="portal-v2__workspace">
        <header
          className="portal-v2__header"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="portal-v2__header-inner">
            {/* Mobile keeps the compact brand lockup; desktop uses the rail and
                spends this space on the current case context. */}
            <Link href="/portal" className="portal-v2__mobile-brand">
              <LogoMark className="size-7 shrink-0" />
              {brand.logo.wordmark}
            </Link>
            <div className="portal-v2__header-context">
              <span>Your private workspace</span>
              <strong>{applicationLabel}</strong>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LocaleSwitcher current={locale} label={t.common.language} compactBelowSm />
              <NotificationBell />
              <Link
                href="/portal/profile"
                className="hidden text-sm text-text-mid transition-opacity hover:opacity-70 sm:inline"
              >
                {profile.full_name}
              </Link>
              <AccountActions signOutLabel={t.common.signOut} compactBelowSm />
            </div>
          </div>
        </header>

        {/* Single bottom pad: clear the phone/tablet tab bar plus breathing room.
            Intake owns its own focused action bar and therefore reserves no tab
            space. At desktop the fixed case rail replaces the bottom tabs. */}
        <main
          className={`portal-v2__content portal-enter ${
            pathname.startsWith("/portal/intake")
              ? "pb-0"
              : "pb-[calc(var(--shell-bottom)+24px)] lg:pb-10"
          }`}
        >
          {children}
        </main>

        <footer className="portal-v2__footer">
          <Link href="/portal/profile">Profile</Link>
          <Link href="/portal/privacy">{t.portal.yourData}</Link>
          <span>Private document preparation · Applicant-controlled submission</span>
        </footer>
      </div>

      {/* Intake is a focused task flow with its own sticky action bar — two
          stacked bottom bars is one too many. The soft intake gate already keeps
          a new applicant here, and the wizard has a "Save & exit" out. */}
      {!pathname.startsWith("/portal/intake") && (
        <PortalBottomNav unread={unread ?? 0} concierge={isConcierge} />
      )}
    </div>
  )
}
