"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, UserCog, Radio, FolderOpen, CalendarClock, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/instructor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/instructor/feed", label: "Feed", icon: Radio },
  { href: "/instructor/cases", label: "Cases", icon: FolderOpen },
  { href: "/instructor/availability", label: "Availability", icon: CalendarClock },
  { href: "/instructor/payouts", label: "Payouts", icon: Wallet },
  { href: "/instructor/profile", label: "Profile", icon: UserCog },
]

/**
 * `unseenRequests` > 0 puts a green dot on Feed — an applicant is looking for an
 * instructor right now. Opening the feed moves the seen-watermark server-side,
 * so the dot clears on the next render without any client bookkeeping.
 */
export function InstructorNav({ unseenRequests = 0 }: { unseenRequests?: number }) {
  const pathname = usePathname()
  return (
    <nav className="border-b border-hairline">
      <div className="mx-auto flex max-w-3xl gap-1 px-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active ? "border-brass text-brass" : "border-transparent text-text-mid hover:text-foreground"
              )}
            >
              <span className="relative flex">
                <Icon className="size-4" />
                {href === "/instructor/feed" && unseenRequests > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex size-2.5"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-ok ring-2 ring-background" />
                  </span>
                )}
              </span>
              {label}
              {href === "/instructor/feed" && unseenRequests > 0 && (
                <span className="sr-only">
                  {unseenRequests} new {unseenRequests === 1 ? "request" : "requests"}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
