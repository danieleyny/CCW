"use client"

import { useState } from "react"
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
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Messages } from "@/lib/i18n/messages"
import type { BrandKey } from "@/config/brands"

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean }

const LABEL_KEYS: Record<string, keyof Messages["shell"]> = {
  Home: "home",
  Checklist: "checklist",
  Documents: "documents",
  People: "people",
  Concierge: "concierge",
  "Your application": "yourApplication",
  Messages: "messages",
  Forms: "forms",
  "Prepared forms": "preparedForms",
  Payments: "payments",
  License: "license",
  "Your license": "yourLicense",
  Appeal: "appeal",
  "Your details": "yourDetails",
  "Profile & your data": "profileAndData",
}

const STATUS_KEYS: Record<string, keyof Messages["shell"]> = {
  "Entered once, reused on every form": "detailsStatus",
  "Your case team & instructor": "messagesStatus",
  "Documents we filled out for you": "formsStatus",
  "Invoices & receipts": "paymentsStatus",
  "Available after issuance": "licenseStatus",
  "Only if your application is denied": "appealStatus",
  "Account, password & privacy": "profileStatus",
}

function localizeLabel(label: string, shell: Messages["shell"]) {
  const key = LABEL_KEYS[label]
  return key ? shell[key] : label
}

function localizeStatus(status: string, shell: Messages["shell"]) {
  const key = STATUS_KEYS[status]
  return key ? shell[key] : status
}

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

/** Desktop keeps EVERY destination in the top row — the More grouping is a phone
 *  affordance, not an information-architecture cut. */
const DESKTOP: Item[] = [
  ...PRIMARY,
  { href: "/portal/details", label: "Your details", icon: IdCard },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/forms", label: "Forms", icon: FileText },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
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
const DESKTOP_CONCIERGE: Item[] = [
  ...PRIMARY_CONCIERGE,
  { href: "/portal/details", label: "Your details", icon: IdCard },
  { href: "/portal/payments", label: "Payments", icon: CreditCard },
  { href: "/portal/license", label: "License", icon: BadgeCheck },
  { href: "/portal/appeal", label: "Appeal", icon: Scale },
]

const UPGRADE_ITEM: MoreItem = {
  href: "/portal/upgrade",
  label: "Upgrade to Concierge",
  icon: ArrowUpRight,
  status: "Move your case to Gun License NYC",
}

function useActive() {
  const pathname = usePathname()
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

/** Desktop: a horizontal tab row under the header. */
export function PortalTopNav({ concierge = false, brand = "gln" }: { concierge?: boolean; brand?: BrandKey }) {
  const isActive = useActive()
  const { messages } = usePortalI18n()
  const shell = messages.shell
  return (
    <nav aria-label={shell.primary} className="portal-v2-top-nav hidden border-t border-hairline md:block">
      <div className="portal-v2-top-nav-wrap mx-auto flex max-w-[1120px] flex-nowrap gap-1 overflow-x-auto px-6 lg:px-8">
        {(concierge ? DESKTOP_CONCIERGE : brand === "fl" ? [...DESKTOP, UPGRADE_ITEM] : DESKTOP).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              data-active={active}
              className="portal-v2-top-nav-item flex shrink-0 items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors"
            >
              <Icon className="size-4" />
              {localizeLabel(label, shell)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Mobile: a frosted-glass fixed bottom bar — four thumb-primary tabs plus a More
 * tab that opens a bottom sheet with everything else. Brass is the "you are here"
 * color (signal is reserved for "needs your attention"). Safe-area aware.
 */
export function PortalBottomNav({ unread = 0, concierge = false, brand = "gln" }: { unread?: number; concierge?: boolean; brand?: BrandKey }) {
  const isActive = useActive()
  const [moreOpen, setMoreOpen] = useState(false)
  const { messages } = usePortalI18n()
  const shell = messages.shell
  const primary = concierge ? PRIMARY_CONCIERGE : PRIMARY
  const more = concierge ? MORE_CONCIERGE : brand === "fl" ? [...MORE, UPGRADE_ITEM] : MORE
  const moreActive = more.some((m) => isActive(m.href, m.exact))

  return (
    <nav
      aria-label={shell.primary}
      className="portal-v2-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-hairline md:hidden"
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
              data-active={active}
              className="portal-v2-bottom-item relative flex min-w-16 flex-1 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-medium transition-colors"
            >
              {active && (
                <span aria-hidden className="portal-v2-bottom-active-mark absolute top-0" />
              )}
              <span
                className={cn("relative flex h-[26px] w-[34px] items-center justify-center rounded-lg", active && "bg-signal-dim")}
              >
                <Icon className="size-5" />
                {href === "/portal/messages" && unread > 0 ? (
                  <span
                    aria-hidden
                    className="portal-v2-unread absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </span>
              {localizeLabel(label, shell)}
              {href === "/portal/messages" && unread > 0 ? (
                <span className="sr-only">, {unread} {shell.unread}</span>
              ) : null}
            </Link>
          )
        })}

        {/* More — opens the sheet */}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
          data-active={moreActive}
          className="portal-v2-bottom-item relative flex min-w-16 flex-1 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-medium transition-colors"
        >
          {moreActive && (
            <span aria-hidden className="portal-v2-bottom-active-mark absolute top-0" />
          )}
          <span
            className={cn("relative flex h-[26px] w-[34px] items-center justify-center rounded-lg", moreActive && "bg-signal-dim")}
          >
            <MoreHorizontal className="size-5" />
            {unread > 0 && !concierge && (
              <span
                aria-hidden
                className="portal-v2-unread absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          {shell.more}
          {unread > 0 && !concierge ? <span className="sr-only">, {unread} {shell.unread}</span> : null}
        </button>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="portal-v2-more-sheet gap-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="gap-3 px-5 pb-2 pt-3">
            <span aria-hidden className="portal-v2-more-handle mx-auto" />
            <SheetTitle className="portal-t-eyebrow text-left text-text-mid">{shell.more}</SheetTitle>
          </SheetHeader>
          <ul className="px-3 pb-4">
            {more.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              const status =
                item.href === "/portal/messages" && unread > 0
                  ? `${unread} ${shell.unreadFromTeam}`
                  : localizeStatus(item.status, shell)
              return (
                <li key={item.href}>
                  <SheetClose asChild>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      data-active={active}
                      className={cn("portal-v2-more-row flex items-center gap-3 rounded-xl px-2 transition-colors", item.conditional && "opacity-70")}
                    >
                      <span className="portal-v2-more-icon">
                        <Icon className={cn("size-[18px]", active && "text-brass-deep")} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm font-medium", active ? "text-brass-bright" : "text-foreground")}>
                          {localizeLabel(item.label, shell)}
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
    </nav>
  )
}
