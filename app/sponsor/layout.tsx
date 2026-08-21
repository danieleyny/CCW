import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
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
          <Link href="/sponsor" className="flex items-center gap-2 whitespace-nowrap font-display text-[15px] font-semibold tracking-tight text-foreground sm:text-lg">
            <LogoMark className="size-7 shrink-0 text-brass sm:size-8" />
            {brand.logo.wordmark}
          </Link>
          <AccountActions signOutLabel="Sign out" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-16 md:pb-8">{children}</main>
    </div>
  )
}
