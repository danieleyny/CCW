"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import BrandLogo from "@/components/brand/BrandLogo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "@/config/admin-nav"
import type { AdminNavCounts } from "@/lib/admin/nav-counts"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

function Count({ value, gold = false }: { value?: number; gold?: boolean }) {
  if (!value) return null
  const visible = value > 999 ? "1k+" : value
  return <span aria-label={`${value} items`} className={cn("ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold", gold ? "bg-[#D9B25F] text-[#0F1E3A]" : "bg-white/12 text-white")}>{visible}</span>
}
export function AdminNavGroups({ counts, role, compact = false, onNavigate }: { counts: AdminNavCounts; role: string; compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Staff console">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group} className={cn("mb-4", compact && "mb-2")}>
          {!compact && <p className="mb-1.5 px-3 font-mono text-[10px] font-medium uppercase tracking-[.2em] text-[#8FA0C2]">{group}</p>}
          <div className="space-y-0.5">
            {ADMIN_NAV.filter((item) => item.group === group && (!item.adminOnly || role === "admin")).map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const badge = item.adminOnlyBadge && role !== "admin" ? undefined : counts[item.key]
              const Icon = item.icon
              return (
                <Link key={item.key} href={item.href} onClick={onNavigate} title={compact ? item.label : undefined} aria-current={active ? "page" : undefined} className={cn("group relative flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors", compact ? "justify-center px-2" : "gap-3 px-3", active ? "bg-white/[.09] text-white" : "text-[#C4CEE0] hover:bg-white/[.06] hover:text-white") }>
                  {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#D9B25F]" />}
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-[#D9B25F]" : "text-[#9DABC4]")} aria-hidden />
                  {!compact && <><span>{item.label}</span><Count value={badge} gold={item.key === "today"} /></>}
                  {compact && badge ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[#D9B25F]" aria-label={`${badge} items`} /> : null}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
export function Sidebar({ counts, name, role, accountActions, onOpenPalette }: { counts: AdminNavCounts; name: string; role: string; accountActions: React.ReactNode; onOpenPalette: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#14254A] text-white lg:flex">
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <BrandLogo href={null} tone="light" size="sm" />
        <p className="ml-9 mt-1 font-mono text-[9px] uppercase tracking-[.24em] text-[#8FA0C2]">Staff console</p>
      </div>
      <div className="px-3 py-4">
        <button type="button" onClick={onOpenPalette} className="flex h-10 w-full items-center gap-2 rounded-lg border border-white/12 bg-white/[.05] px-3 text-left text-sm text-[#C4CEE0] hover:bg-white/[.09]">
          <Search className="size-4" aria-hidden /><span className="flex-1">Jump to…</span><kbd className="font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4"><AdminNavGroups counts={counts} role={role} /></div>
      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/[.06] p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9"><AvatarFallback className="bg-[#D9B25F] text-xs font-semibold text-[#0F1E3A]">{initials(name)}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{name}</p><p className="text-xs capitalize text-[#9DABC4]">{role}</p></div>
          </div>
          <div className="admin-sidebar-actions mt-2">{accountActions}</div>
        </div>
      </div>
    </aside>
  )
}
