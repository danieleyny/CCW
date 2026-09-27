"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Building2, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

/** Minimal sponsor nav (S1): Workers · Company · Requests. Brass marks the active tab. */
const TABS = [
  { href: "/sponsor", label: "Workers", icon: Users, exact: true },
  { href: "/sponsor/company", label: "Company", icon: Building2 },
  { href: "/sponsor/requests", label: "Requests", icon: Inbox },
]

export function SponsorNav() {
  const pathname = usePathname()
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
  return (
    <nav aria-label="Sponsor" className="border-b border-hairline">
      <div className="mx-auto flex max-w-5xl gap-1 px-4">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const on = active(href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                on ? "border-brass text-brass" : "border-transparent text-text-mid hover:text-foreground"
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
