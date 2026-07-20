import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { signOut } from "@/app/auth/actions"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { PortalTopNav, PortalBottomNav } from "@/components/portal/portal-nav"
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
  const [locale, t] = await Promise.all([getLocale(), getMessages()])

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <DarkBackdrop />
      <header className="glass-bar sticky top-0 z-20 border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground">
            <LogoMark className="size-8 text-brass" />
            {brand.logo.wordmark}
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher current={locale} label={t.common.language} />
            <NotificationBell />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile.full_name}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                {t.common.signOut}
              </Button>
            </form>
          </div>
        </div>
        <PortalTopNav />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Not a nav tab — this is rarely-needed but must always be findable. */}
      <footer className="mx-auto w-full max-w-3xl px-4 pb-24 text-xs text-text-low md:pb-6">
        <Link href="/portal/privacy" className="underline hover:text-text-mid">
          {t.portal.yourData}
        </Link>
      </footer>

      <PortalBottomNav />
    </div>
  )
}
