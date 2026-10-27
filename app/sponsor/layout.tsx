import { requireRole } from "@/lib/auth"
import BrandLogo from "@/components/brand/BrandLogo"
import { AccountActions } from "@/components/auth/account-actions"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"

/**
 * The (unlisted) sponsor shell. Same dark visual system as the portal, but no nav
 * — a sponsor reaches exactly one case at a time from their case list. requireRole
 * bounces anyone who isn't a provisioned sponsor; RLS/views do the real scoping.
 */
export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["sponsor"])

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <DarkBackdrop />
      <header className="glass-bar sticky top-0 z-20 border-b border-hairline" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:h-16">
          <BrandLogo href="/sponsor" tone="light" size="sm" />
          <AccountActions signOutLabel="Sign out" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-16 md:pb-8">{children}</main>
    </div>
  )
}
