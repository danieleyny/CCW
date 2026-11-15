"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  ListChecks,
  Upload,
  Users,
  MoreHorizontal,
  MessageCircle,
  FileText,
  CreditCard,
  BadgeCheck,
  Scale,
  ShieldCheck,
  ChevronRight,
  ConciergeBell,
  FolderOpen,
  IdCard,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean }

/** The four thumb-primary destinations always in the bar (+ a 5th "More" tab). */
const PRIMARY: Item[] = [
  { href: "/portal", label: "Home", icon: Home, exact: true },
  { href: "/portal/checklist", label: "Checklist", icon: ListChecks },
  { href: "/portal/documents", label: "Documents", icon: Upload },
  { href: "/portal/people", label: "People", icon: Users },
]

type MoreItem = Item & { status: string; conditional?: boolean }
/** Everything else — reachable in ≤2 taps via the More sheet. We don't hide the
 *  map; stage-gated destinations render muted but stay tappable. */
const MORE: MoreItem[] = [
  { href: "/portal/details", label: "Your details", icon: IdCard, status: "Entered once, reused on every form" },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle, status: "Your case team & instructor" },
  { href: "/portal/forms", label: "Prepared forms", icon: FileText, status: "Documents we filled out for you" },
  { href: "/portal/payments", label: "Payments", icon: CreditCard, status: "Invoices & receipts" },
  { href: "/portal/license", label: "Your license", icon: BadgeCheck, status: "Available after issuance", conditional: true },
  { href: "/portal/appeal", label: "Appeal", icon: Scale, status: "Only if your application is denied", conditional: true },
  { href: "/portal/profile", label: "Profile & your data", icon: ShieldCheck, status: "Account, password & privacy" },
]

const CASE_TOOLS: Item[] = [
  { href: "/portal/details", label: "Your details", icon: IdCard },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/forms", label: "Forms", icon: FileText },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
]
const LATER: Item[] = [
  { href: "/portal/license", label: "License", icon: BadgeCheck },
  { href: "/portal/appeal", label: "Appeal", icon: Scale },
]

// CONCIERGE QA Phase 4 — the done-for-you nav. NO Checklist (no to-do list is
// ever presented to a concierge applicant); their home is the concierge
// dashboard. Documents, Messages, Payments stay.
const PRIMARY_CONCIERGE: Item[] = [
  { href: "/portal/concierge", label: "Concierge", icon: ConciergeBell },
  { href: "/portal/documents", label: "Your application", icon: FolderOpen },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/forms", label: "Forms", icon: FileText },
]
const MORE_CONCIERGE: MoreItem[] = [
  { href: "/portal/details", label: "Your details", icon: IdCard, status: "Entered once, reused on every form" },
  { href: "/portal/payments", label: "Payments", icon: CreditCard, status: "Invoices & receipts" },
  { href: "/portal/license", label: "Your license", icon: BadgeCheck, status: "Available after issuance", conditional: true },
  { href: "/portal/appeal", label: "Appeal", icon: Scale, status: "Only if your application is denied", conditional: true },
  { href: "/portal/profile", label: "Profile & your data", icon: ShieldCheck, status: "Account, password & privacy" },
]
const CASE_TOOLS_CONCIERGE: Item[] = [
  { href: "/portal/details", label: "Your details", icon: IdCard },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
]

function isPathActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function useActive() {
  const pathname = usePathname()
  return (href: string, exact?: boolean) => isPathActive(pathname, href, exact)
}

/**
 * Desktop: a persistent case rail. Grouping keeps the four daily destinations
 * visually separate from supporting tools and later-lifecycle routes; the old
 * ten-item horizontal row forced wrapping and gave every route equal weight.
 */
export function PortalDesktopNav({ concierge = false }: { concierge?: boolean }) {
  const isActive = useActive()
  const groups = concierge
    ? [
        { label: "Case workspace", items: PRIMARY_CONCIERGE },
        { label: "Case tools", items: CASE_TOOLS_CONCIERGE },
        { label: "Later", items: LATER },
      ]
    : [
        { label: "Case workspace", items: PRIMARY },
        { label: "Case tools", items: CASE_TOOLS },
        { label: "Later", items: LATER },
      ]

  return (
    <nav aria-label="Primary" className="portal-rail-nav">
      {groups.map((group) => (
        <div className="portal-rail-group" key={group.label}>
          <p className="portal-rail-label">{group.label}</p>
          <div className="portal-rail-links">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("portal-rail-link", active && "is-active")}
                >
                  <span className="portal-rail-icon" aria-hidden="true">
                    <Icon className="size-[17px]" strokeWidth={1.7} />
                  </span>
                  <span>{label}</span>
                  <ChevronRight className="portal-rail-arrow size-3.5" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/**
 * Mobile: a frosted-glass fixed bottom bar — four thumb-primary tabs plus a More
 * tab that opens a bottom sheet with everything else. Brass is the "you are here"
 * color (signal is reserved for "needs your attention"). Safe-area aware.
 */
export function PortalBottomNav({ unread = 0, concierge = false }: { unread?: number; concierge?: boolean }) {
  const pathname = usePathname()
  const isActive = useActive()
  const primary = concierge ? PRIMARY_CONCIERGE : PRIMARY
  const more = concierge ? MORE_CONCIERGE : MORE
  const moreActive = more.some((m) => isPathActive(pathname, m.href, m.exact))

  return (
    <nav
      aria-label="Primary"
      className="glass-bar fixed inset-x-0 bottom-0 z-30 border-t border-hairline lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex min-h-[60px] max-w-3xl items-stretch justify-around">
        {primary.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-16 flex-1 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-medium transition-colors",
                active ? "text-brass-bright" : "text-text-mid"
              )}
            >
              {active && (
                <span aria-hidden className="absolute top-0 h-[3px] w-[22px] rounded-full bg-brass" />
              )}
              <span
                className={cn(
                  "flex h-[26px] w-[34px] items-center justify-center rounded-lg transition-colors",
                  active && "bg-[color-mix(in_oklab,var(--brass)_14%,transparent)]"
                )}
              >
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          )
        })}

        {/* Radix owns the trigger state and accessibility wiring. Keeping the
            trigger inside the Sheet root also makes the control resilient to
            client transitions and restores focus after the panel closes. */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="More"
              className={cn(
                "relative flex min-w-16 flex-1 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-medium transition-colors",
                moreActive ? "text-brass-bright" : "text-text-mid"
              )}
            >
              {moreActive && (
                <span aria-hidden className="absolute top-0 h-[3px] w-[22px] rounded-full bg-brass" />
              )}
              <span
                className={cn(
                  "relative flex h-[26px] w-[34px] items-center justify-center rounded-lg transition-colors",
                  moreActive && "bg-[color-mix(in_oklab,var(--brass)_14%,transparent)]"
                )}
              >
                <MoreHorizontal className="size-5" />
                {unread > 0 && (
                  <span
                    aria-label={`${unread} unread`}
                    className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[9px] font-bold tabular-nums text-brand-foreground"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              More
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="dark gap-0 rounded-t-2xl border-hairline bg-surface-1 pb-[env(safe-area-inset-bottom)]"
          >
            <SheetHeader>
              <SheetTitle className="engraved-sm text-left text-text-mid">More</SheetTitle>
              <SheetDescription className="sr-only">
                Additional case tools and account destinations.
              </SheetDescription>
            </SheetHeader>
            <ul className="px-3 pb-4">
              {more.map((item) => {
                const Icon = item.icon
                const active = isPathActive(pathname, item.href, item.exact)
                const status =
                  item.href === "/portal/messages" && unread > 0
                    ? `${unread} unread from your case team`
                    : item.status
                return (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[56px] items-center gap-3 rounded-lg px-2 transition-colors hover:bg-surface-2",
                          item.conditional && "opacity-70"
                        )}
                      >
                        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface-2">
                          <Icon className={cn("size-[18px]", active ? "text-brass-bright" : "text-text-mid")} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm font-medium", active ? "text-brass-bright" : "text-foreground")}>
                            {item.label}
                          </span>
                          <span className="block truncate text-[12px] text-text-low">{status}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-text-low" />
                      </Link>
                    </SheetClose>
                  </li>
                )
              })}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
