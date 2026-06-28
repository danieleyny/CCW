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

export function InstructorNav() {
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
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
