"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, CheckCircle2, ClipboardCheck, Copy, CreditCard, FileText, GraduationCap, History, ListChecks, MessageSquare, ShieldCheck, Users, X } from "lucide-react"
import { CASE_STAGES } from "@/config/stages"
import type { CasesOverviewData, CasesRow, CasesView } from "@/lib/admin/cases"
import { getCasePreview, type CasePreviewData } from "@/app/admin/cases/preview-actions"
import { CaseFilters } from "@/components/admin/case-filters"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

const VIEWS: Array<{ key: CasesView; label: string }> = [
  { key: "active", label: "Active" }, { key: "mine", label: "Mine" }, { key: "stalled", label: "Stalled" },
  { key: "leads", label: "Leads" }, { key: "closed", label: "Closed" }, { key: "all", label: "Everything" },
]
const PROGRESS_STAGES = CASE_STAGES.slice(2)
const PHASE_LABELS = ["Start", "Training", "Paperwork", "Filing", "NYPD", "Licensed"]
const JUMP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  requirements: ClipboardCheck, documents: FileText, people: Users, messages: MessageSquare,
  training: GraduationCap, payments: CreditCard, tasks: ListChecks, activity: History,
}
const LEAD_LABELS: Record<string, string> = {
  new: "New",
  screened: "Screened",
  package: "Chose a package — not paid",
  quiet: "Gone quiet",
}

function moveColor(owner: CasesRow["whoseMove"]) {
  if (owner === "Staff") return "bg-[#D9B25F]"
  if (owner === "NYPD") return "bg-[#667085]"
  if (owner === "Third party") return "bg-[#7F56D9]"
  if (owner === "Licensed") return "bg-[#21845A]"
  return "bg-[#2E90FA]"
}

function viewHref(params: URLSearchParams, pathname: string, view: CasesView) {
  const next = new URLSearchParams(params.toString())
  if (view === "active") next.delete("view")
  else next.set("view", view)
  next.delete("case")
  next.delete("page")
  if (view === "all") next.delete("hidden")
  return `${pathname}${next.size ? `?${next.toString()}` : ""}`
}

function Owner({ row }: { row: CasesRow }) {
  return <span title={row.ownerName ?? "Unassigned"} className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold", row.ownerName ? "border-[#D9B25F]/60 bg-[#FFF8E7] text-[#14254A]" : "border-dashed border-[#98A2B3] text-[#667085]")}>{row.ownerInitials}</span>
}

function StageChip({ row }: { row: CasesRow }) {
  const label = row.lastStep ? row.leadGroupLabel : row.stageLabel
  return <span className={cn("inline-flex max-w-full truncate rounded-full px-2 py-1 text-[9.5px] font-semibold", row.nypdControlled ? "bg-[#EAECF0] text-[#475467]" : row.stage === "licensed" ? "bg-[#E6F4EC] text-[#16734A]" : row.lastStep ? "bg-[#FBF3DF] text-[#805B00]" : "bg-[#F2F4F7] text-[#344054]")}>{label}</span>
}

function MiniTrack({ row }: { row: CasesRow }) {
  return <div role="img" aria-label={`Step ${row.progressStep} of 11: ${row.stageLabel}`} className="mt-3 grid grid-cols-11 items-center gap-1">{PROGRESS_STAGES.map((stage, index) => { const step = index + 1; const current = step === row.progressStep; const done = step < row.progressStep; const agency = ["filed", "fingerprinting_booked", "under_investigation", "decision"].includes(stage.key); const licensed = current && stage.key === "licensed"; return <span key={stage.key} className={cn("h-1 rounded-full bg-[#D0D5DD]", done && (agency ? "bg-[#667085]" : "bg-[#14254A]"), current && "h-2 ring-2 ring-white ring-offset-1", current && !agency && !licensed && "bg-[#D9B25F]", current && agency && "bg-[#667085]", licensed && "bg-[#21845A]")} /> })}</div>
}

function DesktopRow({ row, selected, onSelect, onOpen }: { row: CasesRow; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  const label = `${row.clientName}, ${row.stageLabel}, ${row.whoseMove}, ${row.days} days in stage${row.stalled ? ", stalled" : ""}`
  return <div id={`case-option-${row.id}`} role="option" aria-selected={selected} aria-label={label} onClick={onSelect} onDoubleClick={onOpen} className={cn("group grid min-h-[66px] cursor-pointer grid-cols-[minmax(0,1fr)_108px_64px] items-center gap-2 border-b border-black/[.07] bg-white px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[#F8F9FB]", selected ? "border-l-[3px] border-l-[#D9B25F] bg-[#FBF7EC]" : row.stalled && "border-l-[3px] border-l-[#B42318]") }>
    <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><Link href={`/admin/cases/${row.id}`} onClick={(event) => event.stopPropagation()} className="truncate text-[14px] font-semibold text-[#101828] underline-offset-2 hover:underline">{row.clientName}</Link>{row.nonClosedCaseCount > 1 && <span className="shrink-0 rounded-full bg-[#F2EAFE] px-1.5 py-0.5 text-[9px] font-semibold text-[#6941C6]">{row.nonClosedCaseCount}</span>}{row.isDemo && <span className="shrink-0 rounded-full bg-[#FFF3D6] px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#805B00]">Demo</span>}{row.hiddenDuplicate && <span className="shrink-0 rounded-full bg-[#EAECF0] px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#475467]">Duplicate</span>}</div><p className="mt-1 truncate font-mono text-[9.5px] uppercase tracking-[.08em] text-[#667085]">{row.trackLabel} · {row.serviceLabel}</p></div>
    <div className="min-w-0"><StageChip row={row} /><p className="mt-1 flex items-center gap-1 truncate text-[9.5px] text-[#667085]"><span className={cn("size-1.5 shrink-0 rounded-full", moveColor(row.whoseMove))} />{row.whoseMove}</p></div>
    <p className={cn("text-right text-[12px] tabular-nums", row.stalled ? "font-semibold text-[#B42318]" : row.nypdControlled ? "text-[#667085]" : "text-[#475467]")}>{row.days}d{row.stalled && <span className="block text-[8px]">stalled</span>}</p>
  </div>
}

function MobileCard({ row }: { row: CasesRow }) {
  return <Link href={`/admin/cases/${row.id}`} aria-label={`${row.clientName}, ${row.stageLabel}, ${row.whoseMove}, ${row.days} days${row.stalled ? ", stalled" : ""}`} className={cn("block min-h-11 rounded-xl border border-black/[.08] bg-white p-3 shadow-sm", row.stalled && "border-l-[3px] border-l-[#B42318]")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1.5"><strong className="truncate text-[14px] text-[#101828]">{row.clientName}</strong>{row.nonClosedCaseCount > 1 && <span className="shrink-0 rounded-full bg-[#F2EAFE] px-1.5 py-0.5 text-[9px] font-semibold text-[#6941C6]">{row.nonClosedCaseCount} cases</span>}</div><p className="mt-1 truncate font-mono text-[9.5px] uppercase tracking-[.08em] text-[#667085]">{row.trackLabel} · {row.serviceLabel}</p></div><Owner row={row} /></div>{!row.lastStep && <MiniTrack row={row} />}<div className="mt-3 flex items-center gap-2 text-[10.5px]"><span className="font-semibold text-[#344054]">{row.lastStep ? row.leadGroupLabel : row.phaseLabel}</span><StageChip row={row} /><span className={cn("ml-auto tabular-nums", row.stalled && "font-semibold text-[#B42318]", row.nypdControlled && "text-[#667085]")}>{row.days}d{row.lastStep ? " ago" : ""}</span></div><div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10.5px] text-[#667085]"><span className={cn("size-1.5 shrink-0 rounded-full", moveColor(row.whoseMove))} /><span className="shrink-0">{row.whoseMove}</span><span aria-hidden>·</span><span className="truncate text-[#344054]">{row.lastStep ?? row.nextStep}</span></div></Link>
}

function PreviewSkeleton() {
  return <div className="animate-pulse space-y-5 p-5 motion-reduce:animate-none"><div className="flex gap-3"><div className="size-12 rounded-full bg-black/10" /><div className="flex-1 space-y-2"><div className="h-6 w-1/2 rounded bg-black/10" /><div className="h-3 w-2/3 rounded bg-black/10" /></div></div><div className="h-28 rounded-xl bg-black/10" /><div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((value) => <div key={value} className="h-24 rounded-xl bg-black/10" />)}</div></div>
}

function copy(value: string | null) { if (value) void navigator.clipboard.writeText(value) }

function PreviewPanel({ preview, pending, error, caseId, onRetry }: { preview: CasePreviewData | null; pending: boolean; error: boolean; caseId: string | null; onRetry: () => void }) {
  if (pending && !preview) return <PreviewSkeleton />
  if (error || !preview) return <div className="grid min-h-[360px] place-items-center p-8 text-center"><div><h2 className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">Couldn&apos;t load this preview</h2><p className="mt-2 text-sm text-[#667085]">The case itself is fine.</p><div className="mt-4 flex justify-center gap-2"><Button onClick={onRetry} className="bg-[#14254A] text-white">Try again</Button>{caseId && <Button asChild variant="outline"><Link href={`/admin/cases/${caseId}`}>Open case</Link></Button>}</div></div></div>
  const ownerLine = preview.whoseMove === "Staff" ? "Staff's move" : preview.whoseMove === "Applicant" ? "Waiting on the applicant" : preview.whoseMove === "Third party" ? "Waiting on a third party" : preview.whoseMove === "NYPD" ? "With the NYPD — their clock" : "Licensed"
  return <section aria-label={`Preview: ${preview.clientName}`} className="min-h-0">
    <header className="rounded-t-2xl bg-gradient-to-br from-[#FFFDF7] to-[#F6F0E3] p-5"><div className="flex items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#213A6C] to-[#0F1E3A] text-sm font-bold text-white">{preview.initials}</div><div className="min-w-0 flex-1"><h2 aria-live="polite" className="truncate font-[family-name:var(--font-title)] text-[28px] font-semibold leading-none text-[#101828]">{preview.clientName}</h2><p className="mt-2 truncate font-mono text-[9.5px] uppercase tracking-[.1em] text-[#667085]">{preview.trackLabel} · {preview.serviceLabel} · OPENED {new Date(preview.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p></div><Button asChild className="hidden shrink-0 bg-[#14254A] text-white sm:inline-flex"><Link href={`/admin/cases/${preview.id}`}>Open case <ArrowRight className="size-4" /></Link></Button></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#475467]">{preview.email && <span className="group flex items-center gap-1">{preview.email}<button onClick={() => copy(preview.email)} aria-label="Copy email" className="opacity-60 hover:opacity-100"><Copy className="size-3" /></button></span>}{preview.phone && <span className="group flex items-center gap-1">{preview.phone}<button onClick={() => copy(preview.phone)} aria-label="Copy phone" className="opacity-60 hover:opacity-100"><Copy className="size-3" /></button></span>}<span>{preview.ownerName ?? "Unassigned"}</span></div><Button asChild className="mt-4 w-full bg-[#14254A] text-white sm:hidden"><Link href={`/admin/cases/${preview.id}`}>Open case <ArrowRight className="size-4" /></Link></Button></header>
    <div className="space-y-5 p-5">
      {preview.isLead ? <div className="rounded-xl border border-black/[.08] bg-[#F8F9FB] p-4"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#667085]">Lead status</p><h3 className="mt-1 font-[family-name:var(--font-title)] text-xl font-semibold text-[#101828]">{preview.leadGroup ? LEAD_LABELS[preview.leadGroup] ?? preview.leadGroup : "Lead"}</h3><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#667085]">Last step</dt><dd className="text-right font-medium text-[#344054]">{preview.lastStep}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#667085]">Path and package</dt><dd className="text-right font-medium text-[#344054]">{preview.trackLabel} · {preview.serviceLabel}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#667085]">Payment</dt><dd className="text-right font-medium text-[#344054]">{preview.paymentStatus}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#667085]">Last activity</dt><dd className="font-medium text-[#344054]">{preview.days}d ago</dd></div></dl></div> : <div><h3 className="font-[family-name:var(--font-title)] text-xl font-semibold text-[#101828]">{preview.phaseLabel} → {preview.stageLabel} · {preview.days} days</h3><div role="img" aria-label={`Step ${preview.progressStep} of 11: ${preview.stageLabel}`} className="mt-4 grid grid-cols-11 items-center gap-1">{PROGRESS_STAGES.map((stage, index) => { const step = index + 1; const current = step === preview.progressStep; const done = step < preview.progressStep; const agency = ["filed", "fingerprinting_booked", "under_investigation", "decision"].includes(stage.key); return <span key={stage.key} className={cn("h-1.5 rounded-full bg-[#D0D5DD]", done && (agency ? "bg-[#667085]" : "bg-[#14254A]"), current && "h-2.5 bg-[#D9B25F] ring-2 ring-white ring-offset-1", current && agency && "bg-[#667085]", current && stage.key === "licensed" && "bg-[#21845A]")} /> })}</div><div className="mt-2 grid grid-cols-6 text-center font-mono text-[7.5px] uppercase tracking-[.08em] text-[#98A2B3]">{PHASE_LABELS.map((label) => <span key={label}>{label}</span>)}</div></div>}

      <div className="rounded-xl border border-[#D9B25F]/45 bg-[#FFF9EA] p-4"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#14254A] text-[#D9B25F]"><ShieldCheck className="size-5" /></div><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#101828]">Next: {preview.nextStep}</h3><p className="mt-1 text-xs text-[#667085]">{ownerLine}</p></div><Button asChild variant={preview.whoseMove === "Staff" ? "default" : "outline"} size="sm" className={cn(preview.whoseMove === "Staff" && "bg-[#14254A] text-white")}><Link href={preview.nextHref}>{preview.nextAction}</Link></Button></div></div>

      {preview.openBeforeFiling && <section><h3 className="text-sm font-semibold text-[#101828]">Still open before filing · {preview.openBeforeFiling.total} items</h3><div className="mt-2 grid grid-cols-3 gap-2">{preview.openBeforeFiling.boxes.map((box) => <div key={box.label} className="min-w-0 rounded-xl border border-black/[.08] bg-[#F8F9FB] p-3"><span className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">{box.count}</span><p className="text-[10px] font-semibold text-[#475467]">{box.label}</p><ul className="mt-2 space-y-1 text-[9px] text-[#667085]">{box.titles.map((title) => <li key={title} className="truncate">{title}</li>)}{box.count > box.titles.length && <li>+{box.count - box.titles.length}</li>}</ul></div>)}</div>{preview.openBeforeFiling.gate && <p className="mt-2 text-xs text-[#667085]">Pre-filing gate: <span className={preview.openBeforeFiling.gate.passes ? "font-semibold text-[#16734A]" : "font-semibold text-[#B42318]"}>{preview.openBeforeFiling.gate.passes ? "passes" : `${preview.openBeforeFiling.gate.blockerCount} blockers`}</span></p>}</section>}

      <section><h3 className="text-sm font-semibold text-[#101828]">Recent activity</h3>{preview.activity.length ? <ul className="mt-2 divide-y divide-black/[.07] rounded-xl border border-black/[.08]">{preview.activity.map((item) => <li key={item.id} className="flex gap-3 px-3 py-2.5 text-xs"><time className="shrink-0 font-mono text-[9px] text-[#98A2B3]">{new Date(item.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time><span className="text-[#475467]">{item.line}</span></li>)}</ul> : <p className="mt-2 text-xs text-[#98A2B3]">No recent activity to show.</p>}</section>

      {!preview.isLead && <section><h3 className="text-sm font-semibold text-[#101828]">Jump to</h3><div className="mt-2 grid grid-cols-2 gap-2">{preview.jump.map((item) => { const Icon = JUMP_ICONS[item.key] ?? FileText; return <Link key={item.key} href={item.href} className="flex min-w-0 items-center gap-2 rounded-xl border border-black/[.08] bg-white p-3 hover:border-[#D9B25F]"><Icon className="size-4 shrink-0 text-[#14254A]" /><span className="min-w-0"><strong className="block text-xs text-[#101828]">{item.label}</strong><span className={cn("block truncate text-[9.5px] text-[#667085]", item.alert && "font-semibold text-[#B42318]")}>{item.summary}</span></span></Link> })}</div></section>}
    </div>
  </section>
}

export function CasesWorkspace({ data, initialPreview }: { data: CasesOverviewData; initialPreview: CasePreviewData | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [previewCache] = useState(() => new Map<string, CasePreviewData>(initialPreview ? [[initialPreview.id, initialPreview]] : []))
  const [selection, setSelection] = useState({
    baseSelectedId: data.selectedCaseId,
    selectedId: data.selectedCaseId,
    preview: initialPreview,
    error: false,
  })
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const localSelectionIsCurrent = selection.baseSelectedId === data.selectedCaseId
  const selectedId = localSelectionIsCurrent ? selection.selectedId : data.selectedCaseId
  const preview = localSelectionIsCurrent
    ? selection.preview
    : initialPreview?.id === data.selectedCaseId
      ? initialPreview
      : data.selectedCaseId ? previewCache.get(data.selectedCaseId) ?? null : null
  const error = localSelectionIsCurrent ? selection.error : false

  function replaceCase(caseId: string) {
    const next = new URLSearchParams(params.toString())
    next.set("case", caseId)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
  function load(caseId: string) {
    const cached = previewCache.get(caseId)
    if (cached) {
      setSelection({ baseSelectedId: data.selectedCaseId, selectedId: caseId, preview: cached, error: false })
      return
    }
    setSelection({ baseSelectedId: data.selectedCaseId, selectedId: caseId, preview: null, error: false })
    startTransition(async () => {
      try {
        const value = await getCasePreview(caseId)
        previewCache.set(caseId, value)
        while (previewCache.size > 10) previewCache.delete(previewCache.keys().next().value as string)
        setSelection({ baseSelectedId: data.selectedCaseId, selectedId: caseId, preview: value, error: false })
      } catch {
        setSelection({ baseSelectedId: data.selectedCaseId, selectedId: caseId, preview: null, error: true })
      }
    })
  }
  function select(caseId: string, openOverlay = true) {
    replaceCase(caseId)
    load(caseId)
    if (openOverlay && window.innerWidth < 1280) setPreviewOpen(true)
  }
  function moveSelection(direction: "next" | "previous" | "first" | "last") {
    if (!data.rows.length) return
    const current = Math.max(0, data.rows.findIndex((row) => row.id === selectedId))
    const index = direction === "first" ? 0 : direction === "last" ? data.rows.length - 1 : direction === "next" ? Math.min(data.rows.length - 1, current + 1) : Math.max(0, current - 1)
    select(data.rows[index].id, false)
  }
  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    window.setTimeout(() => listRef.current?.focus(), 0)
  }, [])

  const trackedPreviewId = useRef<string | null>(null)
  useEffect(() => {
    if (initialPreview) previewCache.set(initialPreview.id, initialPreview)
  }, [initialPreview, previewCache])

  useEffect(() => {
    if (!preview || trackedPreviewId.current === preview.id) return
    trackedPreviewId.current = preview.id
    trackEvent("admin_case_preview_opened")
  }, [preview])

  useEffect(() => {
    if (!previewOpen) return
    const panel = panelRef.current
    const focusable = panel?.querySelector<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
    focusable?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closePreview(); return }
      if (event.key !== "Tab" || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((item) => !item.hasAttribute("disabled"))
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1) as HTMLElement
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closePreview, previewOpen])

  const activeFilterCount = Object.values(data.filters).filter((value) => value !== "all").length
  const sortHref = (sort: string) => { const next = new URLSearchParams(params.toString()); if (sort === "urgent") next.delete("sort"); else next.set("sort", sort); next.delete("page"); return `${pathname}${next.size ? `?${next.toString()}` : ""}` }
  const showHref = (() => { const next = new URLSearchParams(params.toString()); if (data.showHidden) next.delete("hidden"); else next.set("hidden", "1"); next.delete("page"); return `${pathname}?${next.toString()}` })()
  const loadMoreHref = (() => { const next = new URLSearchParams(params.toString()); next.set("page", String(data.page + 1)); return `${pathname}?${next.toString()}` })()
  const everythingHref = viewHref(params, pathname, "all")
  const selectedRow = data.rows.find((row) => row.id === selectedId)

  return <div className="mx-auto max-w-[1520px]">
    <header className="mb-5 flex items-end justify-between gap-4"><div><h1 className="font-[family-name:var(--font-title)] text-[34px] font-semibold leading-none tracking-[-.02em] text-[#101828]">Cases</h1><p className="mt-2 text-[13px] text-[#667085]">Pick a case to preview it here. Open it to work on it.</p></div><p className="hidden font-mono text-[9.5px] uppercase tracking-[.1em] text-[#98A2B3] md:block">↑ ↓ move · Enter open</p></header>

    <nav role="tablist" aria-label="Case views" className="admin-filter-scroll -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-black/10 px-3 md:mx-0 md:px-0">{VIEWS.map((view) => <Link key={view.key} role="tab" aria-selected={data.view === view.key} href={viewHref(params, pathname, view.key)} className={cn("relative flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold text-[#667085]", data.view === view.key && "text-[#14254A] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[#D9B25F]")}>{view.label}<span className={cn("rounded-full bg-[#EAECF0] px-1.5 py-0.5 text-[9px] text-[#475467]", data.view === view.key && "bg-[#FFF3D6] text-[#805B00]")}>{data.counts[view.key]}</span></Link>)}</nav>

    <div className="mb-4 space-y-3"><CaseFilters key={data.q} filters={data.filters} staff={data.staff} activeFilterCount={activeFilterCount} /><div className="hidden items-center justify-between gap-3 text-[10.5px] text-[#667085] md:flex"><span>{data.shown} of {data.total}</span>{data.view !== "all" && <span>🔒 {data.hidden.test} test &amp; {data.hidden.duplicate} duplicate cases hidden · <Link href={showHref} className="font-semibold text-[#14254A] underline underline-offset-2">{data.showHidden ? "Hide" : "Show"}</Link></span>}</div></div>

    {data.rows.length === 0 ? <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-16 text-center">{data.view === "stalled" && !data.q && !data.isFiltered ? <><CheckCircle2 className="mx-auto size-8 text-[#21845A]" /><h2 className="mt-3 font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">Nothing is stalled right now.</h2></> : <><h2 className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">{data.q ? `No case matches “${data.q}”` : "No cases match these filters"}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-[#667085]">{data.q ? `We searched names, emails and phone numbers in ${data.view}.` : "Adjust or clear the filters to return to the full case list."} <Link href={everythingHref} className="font-semibold text-[#14254A] underline">Try Everything</Link> to include leads and closed cases.</p></>}</div> : <div className="xl:grid xl:grid-cols-[500px_minmax(0,1fr)] xl:items-start xl:gap-[18px]">
      <section className="min-w-0"><div className="mb-2 hidden items-center justify-between md:flex"><span className="text-xs font-semibold text-[#475467]">{data.total} case{data.total === 1 ? "" : "s"}</span><label className="flex items-center gap-2 text-[10px] text-[#667085]">Sort<select value={data.sort} onChange={(event) => router.push(sortHref(event.target.value))} className="h-8 rounded-lg border border-black/10 bg-white px-2 text-xs text-[#344054]"><option value="urgent">Most urgent</option><option value="activity">Last activity</option><option value="name">Name</option></select></label></div>
        <div ref={listRef} role="listbox" tabIndex={0} aria-label="Cases" aria-activedescendant={selectedId ? `case-option-${selectedId}` : undefined} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); moveSelection("next") } if (event.key === "ArrowUp") { event.preventDefault(); moveSelection("previous") } if (event.key === "Home") { event.preventDefault(); moveSelection("first") } if (event.key === "End") { event.preventDefault(); moveSelection("last") } if (event.key === "Enter" && selectedRow) { event.preventDefault(); router.push(`/admin/cases/${selectedRow.id}`) } }} className="hidden max-h-[calc(100svh-270px)] overflow-y-auto rounded-xl border border-black/[.08] bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D9B25F] md:block">{data.rows.map((row) => <DesktopRow key={row.id} row={row} selected={row.id === selectedId} onSelect={() => select(row.id)} onOpen={() => router.push(`/admin/cases/${row.id}`)} />)}</div>
        <div className="space-y-3 md:hidden">{data.rows.map((row) => <MobileCard key={row.id} row={row} />)}</div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#667085]"><span>{data.shown} of {data.total}</span>{data.hasMore && <Button asChild variant="outline" size="sm"><Link href={loadMoreHref}>Load more</Link></Button>}</div>
      </section>

      <aside className="sticky top-20 hidden max-h-[calc(100svh-96px)] overflow-y-auto rounded-2xl border border-black/[.08] bg-white shadow-[0_12px_40px_rgba(16,24,40,.08)] xl:block"><PreviewPanel preview={preview} pending={pending} error={error} caseId={selectedId} onRetry={() => selectedId && load(selectedId)} /></aside>
    </div>}

    {previewOpen && <div className="fixed inset-0 z-50 hidden md:block xl:hidden"><button type="button" aria-label="Close case preview" onClick={closePreview} className="absolute inset-0 bg-[#101828]/35" /><div ref={panelRef} role="dialog" aria-modal="true" aria-label={preview ? `Preview: ${preview.clientName}` : "Case preview"} className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-white shadow-2xl lg:w-[480px]"><button type="button" onClick={closePreview} aria-label="Close preview" className="sticky right-3 top-3 z-10 ml-auto mr-3 mt-3 grid size-9 place-items-center rounded-full border border-black/10 bg-white shadow-sm"><X className="size-4" /></button><PreviewPanel preview={preview} pending={pending} error={error} caseId={selectedId} onRetry={() => selectedId && load(selectedId)} /></div></div>}
  </div>
}
