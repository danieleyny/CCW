"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  FolderOpen,
  Inbox,
  CalendarDays,
  CreditCard,
  BarChart3,
  ScrollText,
  GraduationCap,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/admin/cases", label: "Cases", icon: FolderOpen },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/requirements", label: "Requirements", icon: ScrollText },
  { href: "/admin/legal", label: "Legal review", icon: Scale },
  { href: "/admin/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/admin/instructors", label: "Instructors", icon: GraduationCap },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-hairline px-5 font-display text-lg font-semibold tracking-tight text-foreground">
        <LogoMark className="size-8 text-brass" />
        {brand.logo.wordmark}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-sidebar-foreground hover:bg-surface-2/60 hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brass shadow-[0_0_8px_var(--brass-glow)]" />
              )}
              <Icon className={cn("size-4", active ? "text-brass" : "text-sidebar-foreground")} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="engraved border-t border-hairline px-5 py-4 text-text-low">
        [ Command Center ]
      </div>
    </aside>
  )
}
