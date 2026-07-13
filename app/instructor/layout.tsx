import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { brand } from "@/config/brand"
import { InstructorNav } from "@/components/instructor/instructor-nav"
import { NotificationBell } from "@/components/shared/notification-bell"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["instructor"])
  return (
    <div className="dark flex min-h-svh flex-col bg-muted/30 text-foreground">
      <DarkBackdrop />
      <header className="border-b border-hairline bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/instructor" className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-brass text-xs font-bold text-brand-foreground">
              {brand.logo.mark}
            </span>
            {brand.logo.wordmark}
            <span className="text-text-low">· Instructor</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/" className="text-xs text-text-mid hover:text-foreground">
              Exit
            </Link>
          </div>
        </div>
        <InstructorNav />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
