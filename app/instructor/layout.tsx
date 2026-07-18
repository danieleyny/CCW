import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
import { InstructorNav } from "@/components/instructor/instructor-nav"
import { NotificationBell } from "@/components/shared/notification-bell"
import { DarkBackdrop } from "@/components/theme/dark-backdrop"
import { getMyInstructor } from "@/lib/instructor"
import { createClient } from "@/lib/supabase/server"
import { countUnseenRequests } from "@/lib/instructors/feed-signal"

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["instructor"])

  // The green dot: is anybody looking for an instructor right now that this
  // instructor hasn't answered? Cleared by opening the feed (see the feed page).
  const me = await getMyInstructor()
  const supabase = await createClient()
  const unseenRequests = me
    ? await countUnseenRequests(supabase, { id: me.id, feed_seen_at: me.feed_seen_at })
    : 0
  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <DarkBackdrop />
      <header className="border-b border-hairline bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/instructor" className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <LogoMark className="size-7 text-brass" />
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
        <InstructorNav unseenRequests={unseenRequests} />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
