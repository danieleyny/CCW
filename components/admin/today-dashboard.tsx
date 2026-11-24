"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3,
  ConciergeBell, FileText, Hourglass, MessageCircle, RefreshCw,
  ShieldCheck, ListTodo, UserRoundCheck,
} from "lucide-react"
import type { TodayData, TodayItem, TodayItemType, TodayScope, TodaySection, TodayOwner } from "@/lib/admin/today"
import { cn } from "@/lib/utils"
import { BrandChip } from "@/components/admin/brand-chip"

const FILTERS: Array<{ key: TodayItemType | "all"; label: string }> = [
  { key: "all", label: "All" }, { key: "message", label: "Messages" }, { key: "document", label: "Documents" },
  { key: "qa", label: "Final QA" }, { key: "concierge", label: "Concierge" }, { key: "people", label: "People" },
  { key: "payment", label: "Payments" }, { key: "stalled", label: "Stalled" }, { key: "task", label: "Tasks" },
  { key: "privacy", label: "Privacy" },
]
const TYPE_META = {
  message: { icon: MessageCircle, cls: "bg-[#E7F8F7] text-[#087C77]" },
  document: { icon: FileText, cls: "bg-[#E9EDF5] text-[#14254A]" },
  qa: { icon: ShieldCheck, cls: "bg-[#E8F5EE] text-[#067647]" },
  concierge: { icon: ConciergeBell, cls: "bg-[#FBF4E4] text-[#9A6B10]" },
  people: { icon: UserRoundCheck, cls: "bg-[#F2EAFE] text-[#6D28D9]" },
  payment: { icon: CircleDollarSign, cls: "bg-[#EAF0FF] text-[#1D4ED8]" },
  stalled: { icon: Hourglass, cls: "bg-[#FDECEC] text-[#B42318]" },
  task: { icon: ListTodo, cls: "bg-[#EEF1F4] text-[#475467]" },
  privacy: { icon: ShieldCheck, cls: "bg-[#EEF1F4] text-[#475467]" },
} as const
const OWNER_STYLE: Record<TodayOwner, string> = {
  You: "bg-[#E9EDF5] text-[#14254A]", Team: "bg-[#EEF1F4] text-[#475467]", Applicant: "bg-[#EAF0FF] text-[#1D4ED8]", "Third party": "bg-[#F2EAFE] text-[#6D28D9]", NYPD: "bg-[#EEF1F4] text-[#475467]",
}

function href(scope: TodayScope, type: TodayItemType | "all") {
  const params = new URLSearchParams()
  if (scope !== "mine") params.set("scope", scope)
  if (type !== "all") params.set("type", type)
  return `/admin${params.size ? `?${params.toString()}` : ""}`
}

function QueueRow({ item }: { item: TodayItem }) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  return (
    <li>
      <Link href={item.href} title={`${item.title} — ${item.reason}`} aria-label={`${item.type}, ${item.clientName}, ${item.reason}, ${item.owner}, ${item.age}`} className={cn("admin-today-row group grid min-h-[78px] grid-cols-[34px_minmax(0,1fr)_128px_112px_124px] items-center gap-3 border-b border-black/[.07] bg-white px-4 py-3 last:border-b-0", item.section === "overdue" && "border-l-[3px] border-l-[#B42318]") }>
        <span className={cn("flex size-[34px] items-center justify-center rounded-lg", meta.cls)}><Icon className="size-[17px]" aria-hidden /></span>
        <span className="min-w-0"><span className="flex items-center gap-2"><strong className="block truncate text-sm font-semibold text-[#101828] group-hover:text-[#14254A]">{item.title}</strong>{item.brand ? <BrandChip brand={item.brand} origin={item.brandOrigin ?? item.brand} /> : null}</span><span className="mt-0.5 block truncate text-xs text-[#667085]">{item.reason}</span><span className="mt-1 block font-mono text-[9px] font-medium tracking-[.14em] text-[#667085]">{item.track}</span></span>
        <span className="flex min-w-0 flex-wrap gap-1"><span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", OWNER_STYLE[item.owner])}>{item.owner}</span>{item.unassigned && <span className="rounded-full border border-[#B54708]/30 px-2 py-1 text-[10px] font-semibold text-[#8A3A05]">Unassigned</span>}</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", item.section === "overdue" ? "text-[#B42318]" : item.section === "today" ? "text-[#B54708]" : "text-[#667085]")}><Clock3 className="size-3.5" />{item.age}</span>
        <span className={cn("inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-center text-xs font-semibold", item.section === "overdue" || item.type === "qa" ? "bg-[#14254A] text-white" : "border border-black/15 text-[#14254A]")}>{item.action}</span>
        <ChevronRight className="hidden size-5 text-[#98A2B3]" aria-hidden />
      </Link>
    </li>
  )
}

function Section({ section, items }: { section: TodaySection; items: TodayItem[] }) {
  if (!items.length) return null
  const meta = section === "overdue" ? { label: "Overdue", color: "bg-[#B42318]" } : section === "today" ? { label: "Due today", color: "bg-[#B54708]" } : { label: "This week", color: "bg-[#667085]" }
  return <section aria-labelledby={`today-${section}`} className="mb-5"><div className="mb-2 flex items-center gap-2"><span className={cn("size-2 rounded-full", meta.color)} /><h2 id={`today-${section}`} className="text-sm font-bold text-[#344054]">{meta.label}</h2><span className="text-xs text-[#667085]">{items.length}</span></div><ul className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">{items.map((item) => <QueueRow key={item.id} item={item} />)}</ul></section>
}

function Rail({ data }: { data: TodayData }) {
  return <aside className="admin-today-rail space-y-4">
    <section className="rounded-xl border border-black/10 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-[family-name:var(--font-title)] text-xl font-semibold">{"Today's schedule"}</h2><Link href="/admin/calendar" className="text-xs font-semibold text-[#14254A] underline">Calendar</Link></div>{data.schedule.length ? <ul className="space-y-3">{data.schedule.map((item) => <li key={item.id}><Link href={`/admin/cases/${item.caseId}`} className="grid grid-cols-[52px_1fr] gap-2 rounded-lg p-1 hover:bg-[#F6F7F9]"><time className="font-mono text-xs font-semibold text-[#14254A]">{new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(item.when))}</time><span className="min-w-0"><span className="flex items-center gap-2"><strong className="block truncate text-sm">{item.title}</strong>{item.brand ? <BrandChip brand={item.brand} origin={item.brandOrigin ?? item.brand} /> : null}</span><span className="block truncate text-xs capitalize text-[#667085]">{item.detail}</span><span className="mt-1 inline-block rounded-full bg-[#EEF1F4] px-2 py-0.5 text-[10px] text-[#475467]">{item.owner}</span></span></Link></li>)}</ul> : <p className="text-sm text-[#667085]">Nothing else scheduled today.</p>}</section>
    <section className="rounded-xl border border-black/10 bg-white p-4"><h2 className="mb-3 font-[family-name:var(--font-title)] text-xl font-semibold">Waiting on others</h2><div className="space-y-2">{([data.waiting.nypd, data.waiting.thirdParty, data.waiting.applicant] as const).map((row, index) => <Link key={row.href} href={row.href} className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-lg border border-black/[.07] p-2.5 hover:bg-[#F6F7F9]"><strong className="text-xl text-[#14254A]">{row.count}</strong><span><span className="block text-xs font-semibold">{index === 0 ? "NYPD" : index === 1 ? "Third party" : "Applicant"}</span><span className="block text-[11px] text-[#667085]">{row.detail}</span></span><ChevronRight className="size-4 text-[#98A2B3]" /></Link>)}</div></section>
    <section className="rounded-xl border border-black/10 bg-white p-4"><h2 className="mb-3 font-[family-name:var(--font-title)] text-xl font-semibold">Service health</h2><dl className="space-y-3">{data.health.filter((item) => item.available).map((item) => <div key={item.key} className="flex items-start justify-between gap-3"><dt className="text-xs leading-5 text-[#667085]">{item.label}</dt><dd className={cn("shrink-0 text-sm font-bold", item.pastTarget ? "text-[#B42318]" : "text-[#067647]")}>{item.value}</dd></div>)}</dl><p className="mt-3 border-t pt-3 text-[11px] text-[#667085]">Red = past the target you set.</p></section>
  </aside>
}

export function TodayDashboard({ data, scope, filter, firstName, greeting, role }: { data: TodayData; scope: TodayScope; filter: TodayItemType | "all"; firstName: string; greeting: string; role: string }) {
  const router = useRouter()
  const filtered = filter === "all" ? data.items : data.items.filter((item) => item.type === filter)
  const overdue = filtered.filter((item) => item.section === "overdue")
  const dueToday = filtered.filter((item) => item.section === "today")
  const week = filtered.filter((item) => item.section === "week")
  const allOverdue = data.items.filter((item) => item.section === "overdue").length
  const needsPerson = data.items.filter((item) => item.section !== "week").length
  const waiting = data.waiting.nypd.count + data.waiting.thirdParty.count + data.waiting.applicant.count
  const counts = Object.fromEntries(FILTERS.map((entry) => [entry.key, entry.key === "all" ? data.items.length : data.items.filter((item) => item.type === entry.key).length])) as Record<string, number>
  const next = data.schedule.find((item) => new Date(item.when).getTime() >= new Date(data.asOf).getTime())
  return <div className="mx-auto max-w-[1480px]">
    <header className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><h1 className="font-[family-name:var(--font-title)] text-[28px] font-semibold leading-tight text-[#101828] sm:text-[34px]">{greeting}, {firstName}</h1><p className="mt-1 hidden text-sm text-[#667085] sm:block">{needsPerson} things need a person today — {allOverdue} are overdue. Everything else is waiting on someone else.</p><p className="mt-1 text-sm text-[#667085] sm:hidden">{needsPerson} need a person · {allOverdue} overdue</p></div><div role="radiogroup" aria-label="Queue scope" className="grid w-full grid-cols-3 rounded-lg border border-black/10 bg-white p-1 xl:w-[330px]">{(["mine", "team", "unassigned"] as TodayScope[]).map((entry) => <Link key={entry} role="radio" aria-checked={scope === entry} href={href(entry, filter)} className={cn("rounded-md px-3 py-2 text-center text-xs font-semibold capitalize", scope === entry ? "bg-[#14254A] text-white" : "text-[#667085] hover:bg-[#F6F7F9]")}>{entry}{entry === "unassigned" && ` · ${data.unassignedCount}`}</Link>)}</div></header>
    {next && <Link href="/admin/calendar" className="mb-4 flex items-center gap-3 rounded-xl bg-[#14254A] p-3 text-white md:hidden"><CalendarDays className="size-5 text-[#D9B25F]" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#AAB7CE]">Next{next.brand ? <BrandChip brand={next.brand} origin={next.brandOrigin ?? next.brand} /> : null}</span><strong className="block truncate text-sm">{new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(next.when))} · {next.title}{data.schedule.length > 1 ? ` · then ${data.schedule.length - 1} more today` : ""}</strong></span><ChevronRight className="size-5" /></Link>}
    <div role="toolbar" aria-label="Filter Today queue" className="admin-filter-scroll -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">{FILTERS.filter((entry) => entry.key === "all" || counts[entry.key] > 0).map((entry) => <Link role="button" aria-pressed={filter === entry.key} key={entry.key} href={href(scope, entry.key)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", filter === entry.key ? "border-[#14254A] bg-[#14254A] text-white" : "border-black/10 bg-white text-[#475467] hover:border-[#14254A]/30")}>{entry.label} <span className="ml-1 opacity-70">{counts[entry.key]}</span></Link>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {data.errors.length > 0 && <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-[#B42318]/20 bg-[#FEF3F2] p-3 text-sm text-[#912018]"><AlertTriangle className="size-5 shrink-0" /><p className="flex-1"><strong>{data.errors.join(", ")} {"didn't load."}</strong> Everything else on Today is current.</p><button type="button" onClick={() => router.refresh()} className="inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-4" />Try again</button></div>}
        {!filtered.length ? <div className="rounded-xl border border-black/10 bg-white p-10 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#E8F5EE] text-[#067647]"><Check className="size-6" /></span><h2 className="mt-4 font-[family-name:var(--font-title)] text-2xl font-semibold">Nothing needs you right now</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[#667085]">{data.waiting.applicant.count} cases are with applicants and {data.waiting.nypd.count} with the NYPD. New items will appear here as they come in.</p></div> : <><Section section="overdue" items={overdue} /><Section section="today" items={dueToday} /><Section section="week" items={week} /></>}
        {role !== "admin" && <p className="mt-4 rounded-lg bg-[#EEF1F4] p-3 text-xs text-[#475467]">{"Signed in as Staff: some admin-only work isn't shown."}</p>}
      </div>
      <Rail data={data} />
    </div>
    <p className="mt-6 text-right text-[11px] text-[#98A2B3]">{waiting} active cases are currently waiting on someone else.</p>
  </div>
}
