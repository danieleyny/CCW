"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Menu, Plus, Search } from "lucide-react"
import BrandLogo from "@/components/brand/BrandLogo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminPageMeta } from "@/config/admin-nav"
import { initials } from "@/lib/format"

export function Topbar({ name, role, notification, accountActions, onOpenPalette, menu }: { name: string; role: string; notification: React.ReactNode; accountActions: React.ReactNode; onOpenPalette: () => void; menu: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const meta = adminPageMeta(pathname)
  const pageLabel = pathname === "/admin/pipeline" && searchParams.get("view") === "leads" ? "Pipeline · Leads" : meta.page
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-black/10 bg-white/95 px-3 backdrop-blur lg:h-16 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet><SheetTrigger asChild><button className="inline-flex size-9 items-center justify-center rounded-lg text-[#14254A] lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button></SheetTrigger><SheetContent side="left" className="w-[min(336px,88vw)] border-none bg-[#14254A] p-0 text-white"><SheetHeader className="border-b border-white/10"><SheetTitle className="text-white">Staff console</SheetTitle><SheetDescription className="text-[#9DABC4]">Navigate the consultant workspace.</SheetDescription></SheetHeader>{menu}</SheetContent></Sheet>
        <div className="hidden items-center gap-2 text-sm sm:flex lg:hidden"><BrandLogo href={null} tone="ink" size="sm" responsiveHeader /></div>
        <div className="truncate lg:hidden"><span className="font-[family-name:var(--font-title)] text-[21px] font-semibold text-[#101828]">{pageLabel}</span></div>
        <div className="hidden items-center gap-2 text-sm lg:flex"><span className="text-[#667085]">{meta.group}</span><span className="text-[#98A2B3]">/</span><strong className="text-[#101828]">{pageLabel}</strong></div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 lg:gap-3">
        <button type="button" onClick={onOpenPalette} className="hidden h-9 w-[min(36vw,390px)] items-center gap-2 rounded-lg border border-black/10 bg-[#F6F7F9] px-3 text-left text-sm text-[#667085] md:flex"><Search className="size-4" /><span className="truncate">Search clients, cases, documents, phone or email</span><kbd className="ml-auto font-mono text-[10px]">⌘K</kbd></button>
        <button type="button" onClick={onOpenPalette} className="inline-flex size-9 items-center justify-center rounded-lg text-[#344054] md:hidden" aria-label="Search"><Search className="size-5" /></button>
        {notification}
        <Button asChild size="sm" className="hidden border-0 bg-[var(--gold-btn)] text-[#0F1E3A] shadow-sm hover:brightness-95 sm:inline-flex"><Link href="/admin/clients/new"><Plus className="size-4" />New client</Link></Button>
        <Sheet><SheetTrigger asChild><button className="rounded-full" aria-label="Open account menu"><Avatar className="size-9"><AvatarFallback className="bg-[#14254A] text-xs font-semibold text-white">{initials(name)}</AvatarFallback></Avatar></button></SheetTrigger><SheetContent side="right" className="w-[min(340px,88vw)]"><SheetHeader><SheetTitle>{name}</SheetTitle><SheetDescription className="capitalize">{role} account</SheetDescription></SheetHeader><div className="px-4 [&_div]:flex-col [&_button]:w-full [&_button]:justify-start">{accountActions}</div></SheetContent></Sheet>
      </div>
    </header>
  )
}
