"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ConciergeBell,
  Landmark,
  Users,
} from "lucide-react"
import type {
  ConciergeBoardCard,
  ConciergeBoardColumn,
  ConciergeBoardData,
  ConciergeTab,
} from "@/lib/concierge/board"
import { DeleteDemoCasesButton } from "@/components/admin/delete-demo-cases-button"
import { ConciergeTeam } from "@/components/admin/concierge-team"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const HATCH_STYLE = {
  backgroundColor: "#E9EDF2",
  backgroundImage: "repeating-linear-gradient(135deg,rgba(20,37,74,.045) 0,rgba(20,37,74,.045) 1px,transparent 1px,transparent 8px)",
}

function tabHref(tab: ConciergeTab, data: ConciergeBoardData) {
  const params = new URLSearchParams()
  if (tab !== "enrolled") params.set("tab", tab)
  if (data.agentFilter !== "anyone") params.set("agent", data.agentFilter)
  if (data.showHidden) params.set("showHidden", "1")
  const query = params.toString()
  return query ? `/admin/concierge?${query}` : "/admin/concierge"
}

function hiddenCasesHref(data: ConciergeBoardData) {
  const params = new URLSearchParams()
  if (data.agentFilter !== "anyone") params.set("agent", data.agentFilter)
  if (!data.showHidden) params.set("showHidden", "1")
  const query = params.toString()
  return query ? `/admin/concierge?${query}` : "/admin/concierge"
}

function AgentFilter({ data }: { data: ConciergeBoardData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agents = data.team.filter((member) => member.isAgent)

  function change(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "anyone") params.delete("agent")
    else params.set("agent", value)
    const query = params.toString()
    router.push(query ? `/admin/concierge?${query}` : "/admin/concierge")
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-[#667085] sm:inline">Agent</span>
      <Select value={data.agentFilter} onValueChange={change}>
        <SelectTrigger aria-label="Filter by concierge agent" className="h-9 min-w-[138px] border-black/10 bg-white text-[#344054]">
          <SelectValue placeholder="Anyone" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="anyone">Anyone</SelectItem>
          <SelectItem value="me">Me</SelectItem>
          {agents.filter((agent) => agent.id !== data.currentUserId).map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
          ))}
          <SelectItem value="unassigned">Unassigned</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function MoveChip({ card }: { card: ConciergeBoardCard }) {
  if (card.whoseMove === "Our move") {
    return <span className="rounded-full bg-[#F8EBCB] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#76510E]">Our move</span>
  }
  if (card.whoseMove === "NYPD") {
    return <span className="rounded-full bg-[#E5E9F0] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#475467]">NYPD</span>
  }
  return <span className="rounded-full bg-white/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#667085]">{card.whoseMove}</span>
}

function JourneyCard({ card, column }: { card: ConciergeBoardCard; column: ConciergeBoardColumn }) {
  const label = `${card.clientName}, ${column.label}, next: ${card.nextStep}, ${card.whoseMove}, ${card.days} days${card.stalled ? ", stalled" : ""}`
  return (
    <li>
      <Link
        href={`/admin/cases/${card.caseId}`}
        aria-label={label}
        className={cn(
          "block min-h-[142px] rounded-xl border border-black/[.08] bg-white p-3 shadow-[0_3px_12px_rgba(16,24,40,.05)] transition-[border-color,box-shadow] hover:border-[#14254A]/25 hover:shadow-[0_8px_22px_rgba(16,24,40,.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B25F]",
          card.whoseMove === "Our move" && "border-l-[4px] border-l-[#D9B25F]",
          card.stalled && "border-l-[4px] border-l-[#B42318]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 title={card.clientName} className="line-clamp-2 text-sm font-semibold leading-snug text-[#101828]">{card.clientName}</h3>
          <span title={card.agentName ?? "Unassigned"} className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[9px] font-bold", card.agentName ? "bg-[#14254A] text-white" : "border border-dashed border-[#98A2B3] text-[#667085]")}>{card.agentInitials}</span>
        </div>
        <p className="mt-1.5 truncate font-mono text-[9px] font-medium uppercase tracking-[.1em] text-[#667085]">{card.trackLabel}</p>
        <p title={card.nextStep} className="mt-3 line-clamp-2 text-xs font-medium leading-relaxed text-[#344054]">{card.nextStep}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <MoveChip card={card} />
          <span className={cn("text-[10px] font-semibold", card.stalled ? "text-[#B42318]" : "text-[#667085]")}>{card.days}d{card.column === "nypd" ? " · their clock" : ""}{card.stalled ? " · stalled" : ""}</span>
        </div>
      </Link>
    </li>
  )
}

function JourneyColumn({ column }: { column: ConciergeBoardColumn }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? column.cards : column.cards.slice(0, 8)
  const remaining = column.cards.length - shown.length
  return (
    <section
      aria-labelledby={`concierge-column-${column.key}`}
      className={cn("min-w-0 rounded-xl p-2.5", column.tone === "warm" ? "bg-[#F6F0E1]" : column.tone === "default" ? "bg-[#EDF0F4]" : "")}
      style={column.tone === "agency" ? HATCH_STYLE : undefined}
    >
      <header className="sticky top-0 z-[1] -mx-0.5 mb-2 min-h-[72px] rounded-lg bg-[inherit] px-1.5 py-1.5 backdrop-blur-sm lg:static">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id={`concierge-column-${column.key}`} className="font-display text-[17px] font-semibold text-[#101828]">{column.label}</h2>
          <span className="text-xs font-semibold text-[#667085]">{column.cards.length}</span>
        </div>
        <p className="mt-1 truncate text-[10px] text-[#667085]">{column.subtitle}</p>
      </header>
      <ul className="space-y-2.5">
        {shown.map((card) => <JourneyCard key={card.caseId} card={card} column={column} />)}
      </ul>
      {remaining > 0 ? (
        <button type="button" onClick={() => setExpanded(true)} className="mt-2.5 min-h-9 w-full rounded-lg border border-dashed border-black/15 text-xs font-semibold text-[#475467] hover:bg-white/60">+ {remaining} more</button>
      ) : null}
      {expanded && column.cards.length > 8 ? (
        <button type="button" onClick={() => setExpanded(false)} className="mt-2 min-h-8 w-full text-xs font-semibold text-[#667085]">Show fewer</button>
      ) : null}
    </section>
  )
}

function MobileCaseRow({ card }: { card: ConciergeBoardCard }) {
  return (
    <li>
      <Link
        href={`/admin/cases/${card.caseId}`}
        title={card.clientName}
        className={cn(
          "block rounded-xl border border-black/[.08] bg-white p-3.5 shadow-sm",
          card.whoseMove === "Our move" && "border-l-4 border-l-[#D9B25F]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-semibold text-[#101828]">{card.clientName}</h3>
          <span title={card.agentName ?? "Unassigned"} className="grid size-7 shrink-0 place-items-center rounded-full bg-[#E7ECF4] text-[9px] font-bold text-[#14254A]">{card.agentInitials}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[.1em] text-[#667085]">{card.trackLabel} · {card.column.replaceAll("_", " ")}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="truncate text-xs font-semibold text-[#344054]">{card.nextStep}</p>
          <span className="shrink-0 text-[10px] font-medium text-[#667085]">{card.days}d</span>
        </div>
      </Link>
    </li>
  )
}

function MobileJourney({ data }: { data: ConciergeBoardData }) {
  const ours = data.enrolled.filter((card) => card.whoseMove === "Our move").sort((a, b) => b.days - a.days)
  const waiting = data.enrolled.filter((card) => card.whoseMove !== "Our move" && card.whoseMove !== "NYPD").sort((a, b) => b.days - a.days)
  const nypd = data.enrolled.filter((card) => card.whoseMove === "NYPD").sort((a, b) => b.days - a.days)
  const sections = [
    { title: "Our move", cards: ours },
    { title: "Waiting on the client or a third party", cards: waiting },
    { title: "With the NYPD", cards: nypd },
  ]
  return (
    <div className="space-y-5 md:hidden">
      {sections.map((section) => section.cards.length > 0 ? (
        <section key={section.title}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[.12em] text-[#475467]">{section.title}</h2>
            <span className="text-xs text-[#667085]">{section.cards.length}</span>
          </div>
          <ul className="space-y-2">{section.cards.map((card) => <MobileCaseRow key={card.caseId} card={card} />)}</ul>
        </section>
      ) : null)}
    </div>
  )
}

function TeamStrip({ data }: { data: ConciergeBoardData }) {
  const maxLoad = Math.max(1, ...data.team.map((member) => member.clientCount))
  return (
    <section className="rounded-2xl border border-black/[.08] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Users className="size-4 text-[#9A6B10]" aria-hidden /><h2 className="text-sm font-semibold text-[#101828]">Concierge team</h2></div>
        <Link href={tabHref("team", data)} className="text-xs font-semibold text-[#14254A] hover:underline">Manage</Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {data.team.map((member) => (
          <div key={member.id} className="rounded-xl border border-black/[.07] bg-[#FAFAF8] p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8"><AvatarFallback className="bg-[#E7ECF4] text-[10px] font-bold text-[#14254A]">{initials(member.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#101828]">{member.name}</p><p className="text-[10px] capitalize text-[#667085]">{member.role}</p></div>
              <span className={cn("rounded-full px-2 py-1 text-[9px] font-semibold", member.isAgent ? "bg-[#F8EBCB] text-[#76510E]" : "bg-[#ECEFF3] text-[#667085]")}>{member.isAgent ? "Agent" : "Not an agent"}</span>
            </div>
            {member.isAgent ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#E5E9F0]"><div className="h-full rounded-full bg-[#D9B25F]" style={{ width: `${Math.max(8, (member.clientCount / maxLoad) * 100)}%` }} /></div>
                <p className="mt-1.5 text-[10px] text-[#667085]">{member.clientCount} clients · {member.ourMoveCount} our move</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function EnrolledView({ data }: { data: ConciergeBoardData }) {
  if (data.enrolledCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
        <ConciergeBell className="mx-auto size-7 text-[#D9B25F]" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold text-[#101828]">{data.agentFilter === "anyone" ? "No enrolled concierge clients yet" : "No concierge clients match this agent filter"}</h2>
        <Link href={tabHref("leads", data)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#14254A] hover:underline">View not enrolled yet <ArrowRight className="size-4" /></Link>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {data.ourMoveCount === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#B7DFC8] bg-[#EDF9F2] p-4 text-[#16643F]">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div><p className="text-sm font-semibold">Nothing needs our team right now</p><p className="mt-0.5 text-xs">{data.waitingCount} clients are waiting on themselves, a third party or the NYPD.</p></div>
        </div>
      ) : null}

      <div className="hidden md:block">
        <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-black/[.07] bg-white p-2 shadow-sm">
          <div className="grid min-w-[1370px] grid-cols-[repeat(6,220px)] gap-2.5 lg:min-w-0 lg:grid-cols-6">
            {data.columns.map((column) => <JourneyColumn key={column.key} column={column} />)}
          </div>
        </div>
      </div>
      <MobileJourney data={data} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-black/15 bg-white px-4 py-3 text-xs text-[#475467]">
        <span><strong className="text-[#101828]">{data.leads.length} people</strong> chose Full Concierge but haven&apos;t paid — they&apos;re leads, not clients yet.</span>
        <Link href={tabHref("leads", data)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/10 px-3 font-semibold text-[#14254A] hover:bg-[#F7F8FA]">Not enrolled yet <ArrowRight className="size-3.5" /></Link>
      </div>
      <TeamStrip data={data} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-black/[.07] bg-white px-4 py-3 text-[10px] text-[#667085]">
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-1 rounded bg-[#D9B25F]" />Gold edge = our move</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-1 rounded bg-[#B42318]" />Red edge = stalled 14+ days</span>
        <span className="inline-flex items-center gap-1.5"><Landmark className="size-3.5" />NYPD = their clock</span>
        <span className="ml-auto">{data.licensedThisMonth} licensed this month · {data.duplicatesHidden} duplicates hidden{data.duplicatesHidden > 0 ? <> · <Link className="font-semibold text-[#14254A] underline" href={hiddenCasesHref(data)}>{data.showHidden ? "Hide" : "Show"}</Link></> : null}</span>
      </div>
    </div>
  )
}

function LeadsView({ data }: { data: ConciergeBoardData }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm">
      <div className="border-b border-black/[.07] bg-[#FFF9EA] p-4 text-sm text-[#694B13]">
        These people chose Full Concierge but haven&apos;t paid. They become clients automatically once payment is recorded.
      </div>
      {data.leads.length === 0 ? <p className="p-8 text-center text-sm text-[#667085]">No not-enrolled concierge leads.</p> : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#F7F8FA] text-[10px] uppercase tracking-[.12em] text-[#667085]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Signal</th><th className="px-4 py-3">Since</th><th className="px-4 py-3">Package / path</th><th className="px-4 py-3 text-right">Open case</th></tr></thead>
              <tbody className="divide-y divide-black/[.06]">
                {data.leads.map((lead) => <tr key={lead.caseId}><td className="px-4 py-3 text-sm font-semibold text-[#101828]">{lead.clientName}</td><td className="px-4 py-3 text-sm text-[#475467]">{lead.signal}</td><td className="px-4 py-3 text-sm text-[#667085]">{lead.days}d</td><td className="px-4 py-3 font-mono text-[10px] text-[#667085]">{lead.path}</td><td className="px-4 py-3 text-right"><Link href={`/admin/cases/${lead.caseId}`} className="text-xs font-semibold text-[#14254A] hover:underline">Open case →</Link></td></tr>)}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-black/[.06] md:hidden">
            {data.leads.map((lead) => <li key={lead.caseId}><Link href={`/admin/cases/${lead.caseId}`} className="block p-4"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-[#101828]">{lead.clientName}</span><span className="text-xs text-[#667085]">{lead.days}d</span></div><p className="mt-1.5 text-xs text-[#475467]">{lead.signal}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[.1em] text-[#667085]">{lead.path}</p></Link></li>)}
          </ul>
        </>
      )}
    </section>
  )
}

function TeamView({ data, canEdit }: { data: ConciergeBoardData; canEdit: boolean }) {
  const staff = data.team.filter((member) => member.role === "staff" || member.role === "admin")
  const trainers = data.team.filter((member) => member.role === "instructor")
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#D9B25F]/35 bg-[#FFF9EA] p-4 text-xs text-[#694B13]">
        <strong>&ldquo;Agent&rdquo; is a label for assignment and this queue — not a permission.</strong> Every staff member can already work any case. Agent changes are available to admins on desktop.
      </div>
      <section className="space-y-2"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-[#101828]">Staff</h2><span className="text-xs text-[#667085]">{staff.length}</span></div><ConciergeTeam staff={staff} canEdit={canEdit} /></section>
      <section className="space-y-2"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-[#101828]">Trainers</h2><span className="text-xs text-[#667085]">{trainers.length}</span></div>{trainers.length > 0 ? <ConciergeTeam staff={trainers} canEdit={canEdit} /> : <p className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-[#667085]">No trainers.</p>}</section>
    </div>
  )
}

export function ConciergeWorkspace({ data, tab, canEdit }: { data: ConciergeBoardData; tab: ConciergeTab; canEdit: boolean }) {
  const tabs: Array<{ key: ConciergeTab; label: string; count: number }> = [
    { key: "enrolled", label: "Enrolled", count: data.enrolledCount },
    { key: "leads", label: "Not enrolled yet", count: data.leads.length },
    { key: "team", label: "Team", count: data.team.length },
  ]
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#101828]">Concierge</h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#667085]">
            {data.enrolledCount} enrolled Full Concierge client{data.enrolledCount === 1 ? "" : "s"}. {data.ourMoveCount} need our team now. We prepare every filing detail; the applicant reviews and submits with our guidance.
          </p>
        </div>
        <div className="flex items-center gap-2"><AgentFilter data={data} />{canEdit ? <DeleteDemoCasesButton count={data.demoCount} /> : null}</div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:hidden">
        <div className="rounded-xl border border-[#D9B25F]/40 bg-[#FFF8E7] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#76510E]">Our move</p><p className="mt-1 font-display text-3xl font-semibold text-[#101828]">{data.ourMoveCount}</p></div>
        <div className="rounded-xl border border-black/[.08] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#667085]">Waiting</p><p className="mt-1 font-display text-3xl font-semibold text-[#101828]">{data.waitingCount}</p></div>
      </div>

      <nav aria-label="Concierge views" className="-mx-3 flex gap-2 overflow-x-auto border-b border-black/[.08] px-3 sm:mx-0 sm:px-0">
        {tabs.map((item) => <Link key={item.key} href={tabHref(item.key, data)} aria-current={tab === item.key ? "page" : undefined} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-2 text-sm font-semibold", tab === item.key ? "border-[#D9B25F] text-[#14254A]" : "border-transparent text-[#667085] hover:text-[#344054]")}>{item.label}<span className="rounded-full bg-[#E9EDF3] px-2 py-0.5 text-[10px] text-[#475467]">{item.count}</span></Link>)}
      </nav>

      {tab === "enrolled" ? <EnrolledView data={data} /> : tab === "leads" ? <LeadsView data={data} /> : <TeamView data={data} canEdit={canEdit} />}
      <p className="sr-only" aria-live="polite"><Clock3 className="size-4" /> Concierge data loaded.</p>
    </div>
  )
}
