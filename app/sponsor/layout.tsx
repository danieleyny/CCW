import { requireRole } from "@/lib/auth"
import BrandLogo from "@/components/brand/BrandLogo"
import { AccountActions } from "@/components/auth/account-actions"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"
import { SponsorNav } from "@/components/sponsor/sponsor-nav"

/**
 * The (unlisted) sponsor shell. Same dark visual system as the portal. Now that a rep
 * runs MANY workers (S1) it carries a minimal nav — Workers · Company · Requests.
 * requireRole bounces anyone who isn't a provisioned sponsor; RLS/views do the real
 * scoping. The board is wider than the old single-case list, so the shell is max-w-5xl.
 */
export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["sponsor"])

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <DarkBackdrop />
      <header className="glass-bar sticky top-0 z-20 border-b border-hairline" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16">
          <BrandLogo href="/sponsor" tone="light" size="sm" accessibleLabel="Gun License NYC sponsor home" />
          <AccountActions signOutLabel="Sign out" />
        </div>
      </header>
      <SponsorNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-16 md:pb-8">{children}</main>
    </div>
  )
}
