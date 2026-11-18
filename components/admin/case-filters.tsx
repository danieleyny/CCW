"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Filter, Search, SlidersHorizontal, X } from "lucide-react"
import { BOROUGHS } from "@/config/stages"
import type { CasesFilters } from "@/lib/admin/cases"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "all"
const PHASES = [
  ["getting_started", "Getting started"], ["training", "Training"], ["paperwork", "Paperwork"],
  ["filing", "Filing"], ["nypd", "With NYPD"], ["licensed", "Licensed"],
] as const

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-semibold text-[#475467]"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="h-9 min-w-[150px] border-black/10 bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
}

function AdvancedFilters({ filters, update }: { filters: CasesFilters; update: (key: string, value: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <FilterSelect label="Track" value={filters.track} onChange={(value) => update("track", value)} options={[{ value: ALL, label: "All tracks" }, { value: "premise", label: "Premise" }, { value: "concealed", label: "Concealed" }, { value: "special", label: "Special" }]} />
    <FilterSelect label="Service" value={filters.service} onChange={(value) => update("service", value)} options={[{ value: ALL, label: "All services" }, { value: "concierge", label: "Concierge" }, { value: "self_guided", label: "Self-guided" }, { value: "none", label: "No package" }]} />
    <FilterSelect label="Whose move" value={filters.whose} onChange={(value) => update("whose", value)} options={[{ value: ALL, label: "Anyone" }, { value: "staff", label: "Staff" }, { value: "applicant", label: "Applicant" }, { value: "third_party", label: "Third party" }, { value: "nypd", label: "NYPD" }, { value: "licensed", label: "Licensed" }]} />
    <FilterSelect label="Borough" value={filters.borough} onChange={(value) => update("borough", value)} options={[{ value: ALL, label: "All boroughs" }, ...BOROUGHS.map((borough) => ({ value: borough, label: borough }))]} />
  </div>
}

export function CaseFilters({ filters, staff, activeFilterCount }: { filters: CasesFilters; staff: Array<{ id: string; name: string }>; activeFilterCount: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const desktopSearchRef = useRef<HTMLInputElement>(null)
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const queryString = params.toString()
  const [search, setSearch] = useState(params.get("q") ?? "")

  function href(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === ALL) next.delete(key)
      else next.set(key, value)
    }
    next.delete("page")
    next.delete("case")
    const query = next.toString()
    return `${pathname}${query ? `?${query}` : ""}`
  }
  function update(key: string, value: string) { router.push(href({ [key]: value })) }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentParams = new URLSearchParams(queryString)
      const current = currentParams.get("q") ?? ""
      if (search.trim() === current) return
      if (search.trim()) currentParams.set("q", search.trim())
      else currentParams.delete("q")
      currentParams.delete("page")
      currentParams.delete("case")
      const next = currentParams.toString()
      router.replace(`${pathname}${next ? `?${next}` : ""}`)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [pathname, queryString, router, search])

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return
      event.preventDefault()
      if (window.innerWidth >= 768) desktopSearchRef.current?.focus()
      else mobileSearchRef.current?.focus()
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const ownerOptions = [{ value: ALL, label: "Anyone" }, { value: "me", label: "Me" }, ...staff.map((person) => ({ value: person.id, label: person.name })), { value: "unassigned", label: "Unassigned" }]
  const phaseOptions = [{ value: ALL, label: "All phases" }, ...PHASES.map(([value, label]) => ({ value, label }))]
  const advancedFilterCount = [filters.track, filters.service, filters.whose, filters.borough].filter((value) => value !== ALL).length
  const clear = () => router.push(href({ phase: null, owner: null, track: null, service: null, whose: null, borough: null, status: null, stage: null }))

  return <>
    <div className="hidden items-end gap-2 md:flex">
      <label className="relative grid min-w-0 flex-1 gap-1 text-xs font-semibold text-[#475467] xl:max-w-[500px]"><span className="sr-only">Search cases</span><Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-[#667085]" /><Input ref={desktopSearchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or phone…" className="h-10 border-black/10 bg-white pl-9 text-sm" /></label>
      <FilterSelect label="Phase" value={filters.phase} onChange={(value) => update("phase", value)} options={phaseOptions} />
      <FilterSelect label="Owner" value={filters.owner} onChange={(value) => update("owner", value)} options={ownerOptions} />
      <Popover><PopoverTrigger asChild><Button variant="outline" className="h-9 gap-2 border-black/10 bg-white text-xs"><SlidersHorizontal className="size-4" />More filters{advancedFilterCount > 0 && <span className="rounded-full bg-[#14254A] px-1.5 py-0.5 text-[9px] text-white">{advancedFilterCount}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="w-[420px] p-4"><AdvancedFilters filters={filters} update={update} /></PopoverContent></Popover>
      {activeFilterCount > 0 && <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-9 gap-1 text-xs text-[#667085]"><X className="size-3.5" />Clear</Button>}
    </div>

    <div className="grid grid-cols-[1fr_auto] gap-2 md:hidden">
      <label className="relative"><span className="sr-only">Search cases</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#667085]" /><Input ref={mobileSearchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or phone…" className="h-10 border-black/10 bg-white pl-9" /></label>
      <Sheet><SheetTrigger asChild><Button variant="outline" className="h-10 gap-2 border-black/10 bg-white"><Filter className="size-4" />Filters{activeFilterCount > 0 && <span className="rounded-full bg-[#D9B25F] px-1.5 py-0.5 text-[10px] font-bold text-[#14254A]">{activeFilterCount}</span>}</Button></SheetTrigger><SheetContent side="bottom" className="max-h-[86svh] overflow-y-auto rounded-t-2xl"><SheetHeader><SheetTitle>Filter cases</SheetTitle><SheetDescription>Every filter stays in the URL so you can return to this view.</SheetDescription></SheetHeader><div className="grid gap-4 px-4 pb-8"><FilterSelect label="Phase" value={filters.phase} onChange={(value) => update("phase", value)} options={phaseOptions} /><FilterSelect label="Owner" value={filters.owner} onChange={(value) => update("owner", value)} options={ownerOptions} /><AdvancedFilters filters={filters} update={update} />{activeFilterCount > 0 && <Button variant="outline" onClick={clear}>Clear all filters</Button>}</div></SheetContent></Sheet>
    </div>
  </>
}
