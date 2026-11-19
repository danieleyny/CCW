import {
  BarChart3,
  CalendarDays,
  ConciergeBell,
  CreditCard,
  FolderOpen,
  GraduationCap,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  ShieldCheck,
  Scale,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react"

export type AdminNavGroup = "Work" | "Cases" | "Operations" | "Governance"

export type AdminNavKey =
  | "today" | "inbox" | "calendar" | "cases" | "pipeline" | "queue"
  | "concierge" | "payments" | "training" | "instructors" | "requirements"
  | "legal" | "privacy" | "reports"

export interface AdminNavItem {
  key: AdminNavKey
  href: string
  label: string
  group: AdminNavGroup
  icon: LucideIcon
  exact?: boolean
  adminOnly?: boolean
  adminOnlyBadge?: boolean
}

export const ADMIN_NAV: AdminNavItem[] = [
  { key: "today", href: "/admin", label: "Today", group: "Work", icon: LayoutDashboard, exact: true },
  { key: "inbox", href: "/admin/inbox", label: "Inbox", group: "Work", icon: Inbox },
  { key: "calendar", href: "/admin/calendar", label: "Calendar", group: "Work", icon: CalendarDays },
  { key: "cases", href: "/admin/cases", label: "Cases", group: "Cases", icon: FolderOpen },
  { key: "queue", href: "/admin/queue", label: "Filing queue", group: "Cases", icon: ListChecks },
  { key: "concierge", href: "/admin/concierge", label: "Concierge", group: "Cases", icon: ConciergeBell },
  { key: "pipeline", href: "/admin/pipeline", label: "Pipeline", group: "Cases", icon: KanbanSquare },
  { key: "payments", href: "/admin/payments", label: "Payments", group: "Operations", icon: CreditCard },
  { key: "training", href: "/admin/training", label: "Training", group: "Operations", icon: GraduationCap },
  { key: "instructors", href: "/admin/instructors", label: "Instructors", group: "Operations", icon: UserRoundCheck },
  { key: "requirements", href: "/admin/requirements", label: "Requirements", group: "Governance", icon: ScrollText },
  { key: "legal", href: "/admin/legal", label: "Rule review", group: "Governance", icon: Scale, adminOnly: true, adminOnlyBadge: true },
  { key: "privacy", href: "/admin/privacy", label: "Privacy", group: "Governance", icon: ShieldCheck },
  { key: "reports", href: "/admin/reports", label: "Reports", group: "Governance", icon: BarChart3 },
]

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ["Work", "Cases", "Operations", "Governance"]

export function adminPageMeta(pathname: string) {
  if (pathname === "/admin/clients/new") return { group: "Cases", page: "New client" }
  if (pathname.startsWith("/admin/cases/")) return { group: "Cases", page: "Case detail" }
  if (pathname.startsWith("/admin/instructors/")) return { group: "Operations", page: "Instructor" }
  const item = ADMIN_NAV.find((entry) => entry.exact ? pathname === entry.href : pathname.startsWith(entry.href))
  return item ? { group: item.group, page: item.label } : { group: "Staff", page: "Console" }
}
