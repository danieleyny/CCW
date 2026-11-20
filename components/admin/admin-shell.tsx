"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, FolderOpen, Inbox, LayoutDashboard, MoreHorizontal } from "lucide-react"
import { Sidebar, AdminNavGroups } from "@/components/admin/sidebar"
import { Topbar } from "@/components/admin/topbar"
import { CommandPalette } from "@/components/admin/command-palette"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { AdminNavCounts } from "@/lib/admin/nav-counts"
import { cn } from "@/lib/utils"

export function AdminShell({ children, counts, name, role, notification, accountActions }: { children: React.ReactNode; counts: AdminNavCounts; name: string; role: string; notification: React.ReactNode; accountActions: React.ReactNode }) {
  const pathname = usePathname()
  const [palette, setPalette] = useState(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette(true) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const menu = <div className="flex min-h-0 flex-1 flex-col p-3"><AdminNavGroups counts={counts} role={role} /><div className="mt-auto border-t border-white/10 pt-3 text-white [&_div]:flex-col [&_button]:w-full [&_button]:justify-start [&_button]:text-white">{accountActions}</div></div>
  const tabs = [
    { href: "/admin", label: "Today", icon: LayoutDashboard, exact: true, badge: counts.today },
    { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: counts.inbox },
    { href: "/admin/cases", label: "Cases", icon: FolderOpen },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  ]
  return (
    <div className="admin-shell min-h-svh bg-[#F6F7F9] text-[#101828]">
      <Sidebar counts={counts} name={name} role={role} accountActions={accountActions} onOpenPalette={() => setPalette(true)} />
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-16 overflow-y-auto bg-[#14254A] px-2 pt-20 md:block lg:hidden"><AdminNavGroups counts={counts} role={role} compact /></aside>
      <div className="min-w-0 md:pl-16 lg:pl-[248px]">
        <Topbar name={name} role={role} notification={notification} accountActions={accountActions} onOpenPalette={() => setPalette(true)} menu={menu} />
        <main className="min-h-[calc(100svh-64px)] overflow-x-hidden px-3 py-4 pb-24 sm:px-5 md:py-6 lg:px-7 lg:pb-8">{children}</main>
      </div>
      <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(66px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-black/10 bg-white/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,30,58,.08)] md:hidden">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return <Link key={tab.href} href={tab.href} className={cn("relative flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-[#14254A]" : "text-[#667085]")}>{active && <span className="absolute inset-x-4 top-0 h-0.5 bg-[#D9B25F]" />}<span className="relative"><Icon className="size-5" />{tab.badge ? <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-[#D9B25F] px-1 text-[9px] font-bold text-[#0F1E3A]">{tab.badge > 99 ? "99+" : tab.badge}</span> : null}</span>{tab.label}</Link>
        })}
        <Sheet><SheetTrigger asChild><button className="flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[#667085]"><MoreHorizontal className="size-5" />More</button></SheetTrigger><SheetContent side="bottom" className="max-h-[82svh] rounded-t-2xl bg-[#14254A] p-0 text-white"><SheetHeader className="border-b border-white/10"><SheetTitle className="text-white">All staff pages</SheetTitle><SheetDescription className="text-[#9DABC4]">The complete consultant workspace.</SheetDescription></SheetHeader><div className="overflow-y-auto p-3"><AdminNavGroups counts={counts} role={role} /></div></SheetContent></Sheet>
      </nav>
      <CommandPalette open={palette} onOpenChange={setPalette} role={role} />
    </div>
  )
}
