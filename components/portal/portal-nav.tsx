"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  ListChecks,
  Upload,
  Users,
  MessageCircle,
  BadgeCheck,
  Scale,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/checklist", label: "Checklist", icon: ListChecks },
  { href: "/portal/documents", label: "Documents", icon: Upload },
  { href: "/portal/people", label: "People", icon: Users },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/license", label: "License", icon: BadgeCheck },
  { href: "/portal/appeal", label: "Appeal", icon: Scale },
]

function useActive() {
  const pathname = usePathname()
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)
}

/** Desktop: a horizontal tab row under the header. */
export function PortalTopNav() {
  const isActive = useActive()
  return (
    <nav className="hidden border-b border-hairline md:block">
      <div className="mx-auto flex max-w-3xl gap-1 px-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-brass text-brass"
                  : "border-transparent text-text-mid hover:text-foreground"
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

/** Mobile: a frosted-glass fixed bottom tab bar (thumb-reachable, safe-area aware). */
export function PortalBottomNav() {
  const isActive = useActive()
  return (
    <nav
      className="glass-bar fixed inset-x-0 bottom-0 z-20 border-t border-hairline md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-signal" : "text-text-mid"
              )}
            >
              {active && (
                <span className="absolute inset-x-5 top-0 h-px bg-signal shadow-[0_0_8px_var(--signal)]" />
              )}
              <Icon className="size-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
