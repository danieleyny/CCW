"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { ADMIN_NAV } from "@/config/admin-nav"
import { searchAdminCases, type AdminSearchResult } from "@/app/admin/search-actions"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { BrandChip } from "@/components/admin/brand-chip"
import { cn } from "@/lib/utils"
import type { BrandKey } from "@/config/brands"

export function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: string }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AdminSearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [pending, startTransition] = useTransition()
  const nav = useMemo(
    () => ADMIN_NAV.filter((item) => (!item.adminOnly || role === "admin") && (!query || item.label.toLowerCase().includes(query.toLowerCase()))),
    [query, role]
  )
  const rows: Array<{ id: string; href: string; title: string; sub: string; brand: BrandKey | null; brandOrigin: BrandKey | null }> = [
    ...nav.map((item) => ({ id: `nav-${item.key}`, href: item.href, title: item.label, sub: item.group, brand: null, brandOrigin: null })),
    ...results.map((item) => ({ id: `case-${item.caseId}`, href: `/admin/cases/${item.caseId}`, title: item.name, sub: `${item.track} · ${item.stage}`, brand: item.brand, brandOrigin: item.brandOrigin })),
  ]

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (query.trim().length < 2) { setResults([]); return }
      startTransition(async () => setResults(await searchAdminCases(query)))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query, open])

  function go(href: string) {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-command-palette max-h-[min(680px,90svh)] max-w-2xl overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Search staff console</DialogTitle>
        <DialogDescription className="sr-only">Navigate to a staff page or find a client case by name, email, or phone.</DialogDescription>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-5 text-[#667085]" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelected(0) }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setSelected((value) => Math.min(rows.length - 1, value + 1)) }
              if (event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => Math.max(0, value - 1)) }
              if (event.key === "Enter" && rows[selected]) { event.preventDefault(); go(rows[selected].href) }
            }}
            placeholder="Search clients, cases, phone or email"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#98A2B3]"
          />
          <kbd className="hidden rounded border bg-[#F6F7F9] px-2 py-1 font-mono text-[10px] text-[#667085] sm:block">ESC</kbd>
        </div>
        <div className="max-h-[520px] overflow-y-auto p-2">
          {!query && <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#667085]">Go to</p>}
          {query.trim().length >= 2 && <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#667085]">Pages, clients & cases</p>}
          {rows.map((row, index) => (
            <button key={row.id} type="button" onMouseEnter={() => setSelected(index)} onClick={() => go(row.href)} className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left", selected === index && "bg-[#F0F3F8]") }>
              <span className="min-w-0"><span className="flex items-center gap-2 truncate font-medium text-[#101828]">{row.title}{row.brand ? <BrandChip brand={row.brand} origin={row.brandOrigin ?? row.brand} /> : null}</span><span className="block truncate text-xs capitalize text-[#667085]">{row.sub}</span></span>
              <span aria-hidden className="text-[#98A2B3]">↵</span>
            </button>
          ))}
          {query.trim().length >= 2 && !pending && !rows.length && <p className="p-8 text-center text-sm text-[#667085]">No matching pages, clients, or cases.</p>}
          {pending && <p className="px-3 py-4 text-sm text-[#667085]">Searching…</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
