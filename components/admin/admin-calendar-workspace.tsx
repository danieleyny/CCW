"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  GraduationCap,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import {
  CALENDAR_EVENT_TYPES,
  NEW_YORK_TIME_ZONE,
  addCalendarDays,
  newYorkDateKey,
  type CalendarData,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarNeed,
  type CalendarOwner,
} from "@/lib/admin/calendar-model"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BrandChip } from "@/components/admin/brand-chip"

const TYPE_META: Record<CalendarEventType, { rail: string; tint: string; text: string; icon: typeof PhoneCall }> = {
  "Intro call": { rail: "#D9B25F", tint: "#FBF4E4", text: "#76510E", icon: PhoneCall },
  Consult: { rail: "#0F8F88", tint: "#E7F8F7", text: "#087C77", icon: Users },
  Fingerprinting: { rail: "#667085", tint: "#EEF1F4", text: "#475467", icon: ShieldCheck },
  "NYPD interview": { rail: "#475467", tint: "#E9EDF2", text: "#344054", icon: ShieldCheck },
  Classroom: { rail: "#7A5AF8", tint: "#F2EAFE", text: "#6D28D9", icon: GraduationCap },
  Range: { rail: "#9B51E0", tint: "#F4EAFE", text: "#6D28D9", icon: GraduationCap },
}

const OWNER_STYLE: Record<CalendarOwner | CalendarNeed["owner"], string> = {
  Staff: "bg-[#FBF4E4] text-[#76510E]",
  Instructor: "bg-[#F2EAFE] text-[#6D28D9]",
  NYPD: "bg-[#EEF1F4] text-[#475467]",
  Client: "bg-[#EAF0FF] text-[#1D4ED8]",
}

function typeMeta(type: string) {
  return TYPE_META[type as CalendarEventType] ?? TYPE_META.Consult
}

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
})
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
})
const LONG_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK_TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
})

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00-05:00`)
}

function eventDay(event: CalendarEvent) {
  return newYorkDateKey(event.startsAt)
}

function dayHeading(key: string, today: string) {
  if (key === today) return `Today · ${DAY_FORMAT.format(dateFromKey(key))}`
  if (key === addCalendarDays(today, 1)) return `Tomorrow · ${DAY_FORMAT.format(dateFromKey(key))}`
  return LONG_DAY_FORMAT.format(dateFromKey(key))
}

function timeParts(value: string) {
  const parts = TIME_FORMAT.formatToParts(new Date(value))
  const time = `${parts.find((part) => part.type === "hour")?.value ?? ""}:${parts.find((part) => part.type === "minute")?.value ?? ""}`
  return { time, period: parts.find((part) => part.type === "dayPeriod")?.value ?? "" }
}

function hourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24
  if (normalized === 0) return "12 AM"
  if (normalized === 12) return "12 PM"
  return `${normalized > 12 ? normalized - 12 : normalized} ${normalized > 12 ? "PM" : "AM"}`
}

function sameTimeRange(event: CalendarEvent) {
  return TIME_FORMAT.format(new Date(event.startsAt)) === TIME_FORMAT.format(new Date(event.endsAt))
}

function eventLink(event: CalendarEvent) {
  return event.canJoin && event.joinUrl ? event.joinUrl : event.href
}

function queryHref(pathname: string, params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (!value) next.delete(key)
    else next.set(key, value)
  }
  const query = next.toString()
  return `${pathname}${query ? `?${query}` : ""}`
}

function TypeChip({ type }: { type: string }) {
  const meta = typeMeta(type)
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: meta.tint, color: meta.text }}>
      <Icon className="size-3" aria-hidden />{type}
    </span>
  )
}

function OwnerChip({ owner }: { owner: CalendarOwner | CalendarNeed["owner"] }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", OWNER_STYLE[owner])}>{owner}</span>
}

function PartialFailure({ errors }: { errors: string[] }) {
  const router = useRouter()
  if (errors.length === 0) return null
  const available = ["Intro calls", "NYPD appointments", "Training bookings", "Training sessions"].filter((source) => !errors.includes(source))
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[#B42318]/25 bg-[#FEF3F2] p-4 text-sm text-[#7A271A] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p><strong>{errors.join(" and ")} didn’t load.</strong> {available.length ? `${available.join(" and ")} are current.` : "Other available calendar data is current."} Nothing was changed.</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()} className="shrink-0 border-[#B42318]/25 bg-white text-[#7A271A]"><RefreshCw className="size-3.5" />Try again</Button>
    </div>
  )
}

function NeedsScheduling({ needs, compact = false }: { needs: CalendarNeed[]; compact?: boolean }) {
  if (needs.length === 0) return null
  return (
    <section aria-labelledby={compact ? "needs-scheduling-compact" : "needs-scheduling"} className={cn("overflow-hidden rounded-xl border border-[#D9B25F]/60 bg-white", compact && "rounded-lg")}>
      <header className={cn("flex items-center gap-2 bg-[#FBF4E4] px-4 py-3", compact && "px-3 py-2.5")}>
        <AlertTriangle className="size-4 text-[#9A6B10]" aria-hidden />
        <h2 id={compact ? "needs-scheduling-compact" : "needs-scheduling"} className="text-sm font-semibold text-[#583E0B]">Needs scheduling <span className="ml-1 rounded-full bg-white/80 px-2 py-0.5 text-xs">{needs.length}</span></h2>
        {!compact && <p className="ml-1 hidden text-xs text-[#76510E] lg:block">Requested or due, but not on the calendar yet</p>}
      </header>
      <ul className="divide-y divide-black/[.07]">
        {needs.map((item) => (
          <li key={item.id} className={cn("grid items-center gap-3 px-4 py-3", compact ? "grid-cols-[1fr_auto] px-3" : "sm:grid-cols-[minmax(0,1fr)_170px_110px]")}>
            <div className="min-w-0">
              <span className="flex items-center gap-2"><strong title={item.clientName} className="block truncate text-sm text-[#101828]">{item.clientName}</strong><BrandChip brand={item.brand} origin={item.brandOrigin} /></span>
              <span className="mt-0.5 block truncate text-xs text-[#667085]">{item.label} · {item.detail}</span>
            </div>
            {!compact && <OwnerChip owner={item.owner} />}
            <Link href={item.href} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-[#14254A] hover:bg-[#F6F7F9]">{item.action}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventRow({ event, next, now }: { event: CalendarEvent; next: boolean; now: Date }) {
  const start = timeParts(event.startsAt)
  const end = timeParts(event.endsAt)
  const past = new Date(event.endsAt).getTime() < now.getTime()
  const meta = typeMeta(event.type)
  const href = eventLink(event)
  const external = event.canJoin && !!event.joinUrl
  const label = `${TIME_FORMAT.format(new Date(event.startsAt))} ${event.type} with ${event.clientName} at ${event.place}, ${event.hostLine}`
  return (
    <li>
      <Link
        href={href}
        data-calendar-join={external ? "true" : undefined}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener" : undefined}
        aria-label={external ? `Join intro call with ${event.clientName}. ${label}` : label}
        className={cn(
          "group relative grid min-h-[84px] grid-cols-[70px_5px_minmax(0,1fr)_110px] items-center gap-3 border-b border-black/[.07] bg-white px-3 py-3 transition-colors last:border-b-0 hover:bg-[#F8F9FB] sm:grid-cols-[86px_6px_minmax(0,1fr)_140px] sm:px-4 xl:grid-cols-[86px_6px_minmax(0,1fr)_220px_150px]",
          past && "opacity-55",
          next && "bg-[#FFF9EA] hover:bg-[#FFF5D8]"
        )}
      >
        <time dateTime={event.startsAt} className="font-mono text-sm font-semibold leading-tight text-[#14254A]">
          {start.time}<span className="block text-[9px] tracking-wider text-[#667085]">{start.period}</span>
          {!sameTimeRange(event) && <span className="mt-1 block text-[10px] font-normal text-[#667085]">– {end.time} {end.period}</span>}
        </time>
        <span className="h-full min-h-12 rounded-full" style={{ backgroundColor: meta.rail }} aria-hidden />
        <span className="min-w-0">
          <span className="flex items-center gap-2"><strong title={event.clientName} className="block truncate text-sm font-semibold text-[#101828]">{event.clientName}</strong>{event.brand ? <BrandChip brand={event.brand} origin={event.brandOrigin ?? event.brand} /> : null}</span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5"><TypeChip type={event.type} /><span title={event.place} className="flex min-w-0 items-center gap-1 truncate text-xs text-[#667085]"><MapPin className="size-3 shrink-0" aria-hidden /><span className="truncate">{event.place}</span></span></span>
          <span className="mt-1.5 hidden items-center gap-2 text-xs text-[#667085] lg:flex xl:hidden"><OwnerChip owner={event.owner} />{event.hostLine}</span>
        </span>
        <span className="hidden min-w-0 xl:block"><OwnerChip owner={event.owner} /><span title={event.hostLine} className="mt-1.5 block truncate text-xs text-[#667085]">{event.hostLine}</span></span>
        <span className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-black/10 bg-white px-2 text-center text-xs font-semibold text-[#14254A] shadow-sm">
          {past ? "Done" : external ? "Join call" : event.isGroup ? "Open class" : "Open case"}{external && <ExternalLink className="size-3" aria-hidden />}
        </span>
      </Link>
    </li>
  )
}

function MobileEventRow({ event }: { event: CalendarEvent }) {
  const external = event.canJoin && !!event.joinUrl
  return (
    <li>
      <Link href={eventLink(event)} data-calendar-join={external ? "true" : undefined} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined} aria-label={`${TIME_FORMAT.format(new Date(event.startsAt))} ${event.type} with ${event.clientName} at ${event.place}, ${event.hostLine}`} className="grid min-h-[88px] grid-cols-[58px_1fr] gap-3 border-b border-black/[.07] bg-white px-3 py-3 last:border-b-0">
        <time className="font-mono text-xs font-semibold text-[#14254A]">{TIME_FORMAT.format(new Date(event.startsAt))}</time>
        <span className="min-w-0"><span className="flex items-center gap-2"><strong className="block truncate text-sm text-[#101828]">{event.clientName}</strong>{event.brand ? <BrandChip brand={event.brand} origin={event.brandOrigin ?? event.brand} /> : null}</span><span className="mt-1.5 block"><TypeChip type={event.type} /></span><span className="mt-1.5 flex min-w-0 items-center gap-1 truncate text-xs text-[#667085]"><MapPin className="size-3 shrink-0" /><span className="truncate">{event.place}</span></span></span>
      </Link>
    </li>
  )
}

function EmptyCalendar({ needs }: { needs: number }) {
  return <div className="grid min-h-[280px] place-items-center px-4 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#E9EDF5] text-[#14254A]"><CalendarDays className="size-6" /></span><h2 className="mt-4 font-display text-xl font-semibold text-[#101828]">Nothing on the calendar this week</h2><p className="mt-2 text-sm text-[#667085]">{needs ? `${needs} thing${needs === 1 ? "" : "s"} still need a date — see Needs scheduling.` : "Nothing needs a date either."}</p></div></div>
}

function Agenda({ data, now }: { data: CalendarData; now: Date }) {
  const today = newYorkDateKey(now)
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of data.events) {
    const key = eventDay(event)
    const values = groups.get(key) ?? []
    values.push(event)
    groups.set(key, values)
  }
  const nextToday = data.events.find((event) => eventDay(event) === today && new Date(event.startsAt).getTime() >= now.getTime())?.id
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const showPast = searchParams.get("past") === "1"
  const range = Number(searchParams.get("range") ?? 14)
  const futureGroups = [...groups.entries()].filter(([key]) => key >= today)
  const pastGroups = showPast ? [...groups.entries()].filter(([key]) => key < today).reverse() : []
  const visibleGroups = [...futureGroups, ...pastGroups]
  return (
    <>
      <section className="hidden overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_30px_rgba(16,24,40,.06)] md:block" aria-label="Calendar agenda">
        {visibleGroups.length === 0 ? <EmptyCalendar needs={data.needsScheduling.length} /> : visibleGroups.map(([key, events]) => (
          <section key={key} aria-labelledby={`calendar-day-${key}`}>
            <header className="flex items-center justify-between border-b border-black/[.07] bg-[#F8F9FB] px-4 py-2.5"><h2 id={`calendar-day-${key}`} className="text-sm font-semibold text-[#14254A]">{dayHeading(key, today)}</h2><span className="text-xs font-medium text-[#667085]">{events.length}</span></header>
            <ul>{events.map((event) => <EventRow key={event.id} event={event} next={event.id === nextToday} now={now} />)}</ul>
          </section>
        ))}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[.07] bg-[#F8F9FB] px-4 py-3 text-xs font-semibold">
          <Link href={queryHref(pathname, searchParams, { past: showPast ? null : "1" })} className="text-[#475467]">Past events · {showPast ? "Hide past" : "Show past"}</Link>
          <Link href={queryHref(pathname, searchParams, { range: String(range + 14) })} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[#14254A]">Load more</Link>
        </footer>
      </section>

      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-7 gap-1.5" aria-label="Days in this week">
          {Array.from({ length: 7 }, (_, index) => addCalendarDays(today, index)).map((key) => {
            const events = groups.get(key) ?? []
            const active = key === today
            return <a key={key} href={`#mobile-day-${key}`} className={cn("grid min-h-14 place-items-center rounded-lg border px-1 text-center text-[10px] font-semibold", active ? "border-[#14254A] bg-[#14254A] text-white" : "border-black/10 bg-white text-[#475467]")}><span>{new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, weekday: "narrow" }).format(dateFromKey(key))}</span><span>{Number(key.slice(-2))}</span><span className="flex h-1.5 gap-0.5">{[...new Set(events.map((event) => typeMeta(event.type).rail))].slice(0, 3).map((color) => <i key={color} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />)}</span></a>
          })}
        </div>
        <section className="overflow-hidden rounded-xl border border-black/10 bg-white">
          {visibleGroups.length === 0 ? <EmptyCalendar needs={data.needsScheduling.length} /> : visibleGroups.map(([key, events]) => <section key={key} id={`mobile-day-${key}`} className="scroll-mt-20"><header className="sticky top-0 z-[1] flex items-center justify-between border-b border-black/[.07] bg-[#F8F9FB]/95 px-3 py-2 backdrop-blur"><h2 className="text-xs font-semibold text-[#14254A]">{dayHeading(key, today)}</h2><span className="text-[10px] text-[#667085]">{events.length}</span></header><ul>{events.map((event) => <MobileEventRow key={event.id} event={event} />)}</ul></section>)}
        </section>
      </div>
    </>
  )
}

function minutesInNewYork(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value))
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0)
}

function laneEvents(events: CalendarEvent[]) {
  const lanes: number[] = []
  const values = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => {
    const start = new Date(event.startsAt).getTime()
    let lane = lanes.findIndex((end) => end <= start)
    if (lane < 0) lane = lanes.length
    lanes[lane] = new Date(event.endsAt).getTime()
    return { event, lane }
  })
  return values.map((value) => ({ ...value, total: Math.max(1, lanes.length) }))
}

function WeekGrid({ data, now }: { data: CalendarData; now: Date }) {
  const today = newYorkDateKey(now)
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(data.from, index))
  const minutes = data.events.flatMap((event) => [minutesInNewYork(event.startsAt), minutesInNewYork(event.endsAt)])
  const startHour = Math.min(8, ...minutes.map((value) => Math.floor(value / 60)))
  const endHour = Math.max(19, ...minutes.map((value) => Math.ceil(value / 60)))
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)
  const height = (endHour - startHour) * 52
  const nowMinutes = minutesInNewYork(now.toISOString())
  const nextWeek = data.events.filter((event) => eventDay(event) > addCalendarDays(data.from, 6)).slice(0, 5)
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Weekly calendar" role="grid" className="min-w-0 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_30px_rgba(16,24,40,.06)]">
        <div className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] lg:grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-r border-black/[.07] bg-[#F8F9FB]" />
          {days.map((key, index) => <div key={key} role="columnheader" className={cn("border-b border-r border-black/[.07] px-1 py-2 text-center last:border-r-0", key === today ? "bg-[#FFF9EA]" : "bg-[#F8F9FB]", index >= 3 && "hidden lg:block")}><span className="block text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, weekday: "short" }).format(dateFromKey(key))}</span><span className={cn("mt-0.5 block font-mono text-sm font-bold", key === today ? "text-[#9A6B10]" : "text-[#14254A]")}>{Number(key.slice(-2))}</span></div>)}
          <div className="relative border-r border-black/[.07] bg-[#F8F9FB]" style={{ height }}>{hours.slice(0, -1).map((hour, index) => <span key={hour} className="absolute right-2 -translate-y-1/2 font-mono text-[9px] text-[#667085]" style={{ top: index * 52 }}>{hourLabel(hour)}</span>)}</div>
          {days.map((key, index) => {
            const dayEvents = data.events.filter((event) => eventDay(event) === key)
            const positioned = laneEvents(dayEvents)
            return <div key={key} role="gridcell" className={cn("relative border-r border-black/[.07] last:border-r-0", key === today && "bg-[#FFF9EA]/45", index >= 3 && "hidden lg:block")} style={{ height, backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 51px,rgba(16,24,40,.07) 51px,rgba(16,24,40,.07) 52px)" }}>
              {positioned.map(({ event, lane, total }) => {
                const start = Math.max(startHour * 60, minutesInNewYork(event.startsAt))
                const end = Math.min(endHour * 60, minutesInNewYork(event.endsAt))
                const top = ((start - startHour * 60) / 60) * 52
                const blockHeight = Math.max(24, ((Math.max(end, start + 15) - start) / 60) * 52)
                const meta = typeMeta(event.type)
                const external = event.canJoin && !!event.joinUrl
                return <Link key={event.id} href={eventLink(event)} data-calendar-join={external ? "true" : undefined} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined} title={`${event.clientName} · ${event.type} · ${TIME_FORMAT.format(new Date(event.startsAt))}–${TIME_FORMAT.format(new Date(event.endsAt))} · ${event.place} · ${event.hostLine}`} aria-label={`${LONG_DAY_FORMAT.format(new Date(event.startsAt))}, ${TIME_FORMAT.format(new Date(event.startsAt))} to ${TIME_FORMAT.format(new Date(event.endsAt))}, ${event.type} with ${event.clientName}`} className="absolute z-[1] overflow-hidden rounded-r-md border-l-[3px] px-1.5 py-1 text-[10px] shadow-sm focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14254A]" style={{ top, height: blockHeight, left: `${(lane / total) * 100}%`, width: `calc(${100 / total}% - 2px)`, backgroundColor: meta.tint, borderLeftColor: meta.rail, color: meta.text }}><span className="flex items-center gap-1"><strong className="block truncate">{event.clientName}</strong>{event.brand ? <BrandChip brand={event.brand} origin={event.brandOrigin ?? event.brand} /> : null}</span><span className="block truncate">{event.type} · {TIME_FORMAT.format(new Date(event.startsAt))}</span></Link>
              })}
              {key === today && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 && <span aria-label="Current time" className="pointer-events-none absolute inset-x-0 z-[2] border-t border-[#D92D20]" style={{ top: ((nowMinutes - startHour * 60) / 60) * 52 }}><i className="absolute -left-1 -top-1 size-2 rounded-full bg-[#D92D20]" /></span>}
            </div>
          })}
        </div>
      </section>
      <aside className="grid content-start gap-4 lg:grid-cols-2 xl:grid-cols-1">
        <NeedsScheduling needs={data.needsScheduling} compact />
        <section className="rounded-xl border border-black/10 bg-white p-4"><h2 className="text-sm font-semibold text-[#101828]">Types</h2><div className="mt-3 flex flex-wrap gap-2">{CALENDAR_EVENT_TYPES.map((type) => <TypeChip key={type} type={type} />)}</div></section>
        <section className="rounded-xl border border-black/10 bg-white p-4 lg:col-span-2 xl:col-span-1"><h2 className="text-sm font-semibold text-[#101828]">Next week</h2>{nextWeek.length ? <ul className="mt-2 divide-y divide-black/[.07]">{nextWeek.map((event) => <li key={event.id} className="py-2"><strong className="block truncate text-xs">{event.clientName}</strong><span className="text-[11px] text-[#667085]">{DAY_FORMAT.format(new Date(event.startsAt))} · {TIME_FORMAT.format(new Date(event.startsAt))}</span></li>)}</ul> : <p className="mt-2 text-xs text-[#667085]">Nothing scheduled yet.</p>}</section>
      </aside>
    </div>
  )
}

function TypeFilter({ data }: { data: CalendarData }) {
  const pathname = usePathname()
  const params = useSearchParams()
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="h-9 gap-2 border-black/10 bg-white text-xs text-[#344054]"><SlidersHorizontal className="size-3.5" />Type{data.types.length ? ` · ${data.types.length}` : ""}</Button></PopoverTrigger><PopoverContent align="end" className="w-56 bg-white p-2"><p className="px-2 pb-2 text-xs font-semibold text-[#475467]">Event types</p>{CALENDAR_EVENT_TYPES.map((type) => { const active = data.types.includes(type); const next = active ? data.types.filter((value) => value !== type) : [...data.types, type]; return <Link key={type} href={queryHref(pathname, params, { types: next.length ? next.join(",") : null })} className="flex min-h-9 items-center justify-between rounded-md px-2 text-sm text-[#344054] hover:bg-[#F6F7F9]"><span>{type}</span>{active && <Check className="size-4 text-[#14254A]" />}</Link>})}{data.types.length > 0 && <Link href={queryHref(pathname, params, { types: null })} className="mt-1 block border-t border-black/[.07] px-2 pt-2 text-xs font-semibold text-[#667085]">Clear types</Link>}</PopoverContent></Popover>
}

function CalendarHeader({ data, view }: { data: CalendarData; view: "agenda" | "week" }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const weekLabel = `${new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, month: "short", day: "numeric" }).format(dateFromKey(data.from))}–${new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, day: "numeric" }).format(dateFromKey(addCalendarDays(data.from, 6)))}`
  const agents = data.staff.filter((person) => person.id !== data.currentUserId)
  const previousWeek = addCalendarDays(data.from, -7)
  const nextWeek = addCalendarDays(data.from, 7)
  return <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h1 className="font-display text-3xl font-semibold tracking-tight text-[#101828] sm:text-4xl">Calendar</h1><p className="mt-2 max-w-3xl text-sm text-[#667085]">{view === "agenda" ? "Every intro call, consult, NYPD appointment and training session — with what still needs a date." : `Week of ${weekLabel}`}</p></div><div className="flex flex-wrap items-center gap-2"><span className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-3 text-xs font-medium text-[#475467] shadow-sm md:inline-flex"><Clock3 className="size-3.5" />All times New York (ET)</span><div className="hidden h-9 items-center rounded-lg border border-black/10 bg-white p-1 md:flex"><Link href={queryHref(pathname, params, { view: null })} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", view === "agenda" ? "bg-[#14254A] text-white" : "text-[#667085]")}>Agenda</Link><Link href={queryHref(pathname, params, { view: "week" })} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", view === "week" ? "bg-[#14254A] text-white" : "text-[#667085]")}>Week</Link></div>{view === "week" && <div className="hidden h-9 items-center rounded-lg border border-black/10 bg-white md:flex"><Link aria-label="Previous week" href={queryHref(pathname, params, { week: previousWeek })} className="grid size-9 place-items-center text-[#475467]"><ChevronLeft className="size-4" /></Link><Link href={queryHref(pathname, params, { week: null })} className="px-2 text-xs font-semibold text-[#14254A]">Today</Link><Link aria-label="Next week" href={queryHref(pathname, params, { week: nextWeek })} className="grid size-9 place-items-center text-[#475467]"><ChevronRight className="size-4" /></Link></div>}<div className="hidden h-9 items-center rounded-lg border border-black/10 bg-white p-1 sm:flex"><Link href={queryHref(pathname, params, { scope: "mine" })} className={cn("rounded-md px-2 py-1.5 text-xs font-semibold", data.scope === "mine" ? "bg-[#E9EDF5] text-[#14254A]" : "text-[#667085]")}>Mine</Link><Link href={queryHref(pathname, params, { scope: null })} className={cn("rounded-md px-2 py-1.5 text-xs font-semibold", data.scope === "team" ? "bg-[#E9EDF5] text-[#14254A]" : "text-[#667085]")}>Team</Link></div><TypeFilter data={data} /><Select value={data.host} onValueChange={(value) => router.push(queryHref(pathname, params, { host: value === "anyone" ? null : value }))}><SelectTrigger aria-label="Filter calendar by host" className="h-9 w-[138px] border-black/10 bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="anyone">Anyone</SelectItem><SelectItem value="me">Me</SelectItem>{agents.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}<SelectItem value="instructors">Instructors</SelectItem><SelectItem value="nypd">NYPD</SelectItem></SelectContent></Select></div></header>
}

export function AdminCalendarWorkspace({ data, view }: { data: CalendarData; view: "agenda" | "week" }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const now = new Date(data.asOf)
  useEffect(() => {
    trackEvent("admin_calendar_viewed", { view, types: data.types.join(",") || "all", host: data.host })
  }, [data.host, data.types, view])
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a[data-calendar-join]")
      if (target) trackEvent("admin_calendar_join_clicked")
    }
    document.addEventListener("click", click)
    return () => document.removeEventListener("click", click)
  }, [])
  return <div className="mx-auto max-w-[1680px] space-y-5"><CalendarHeader data={data} view={view} /><p className="text-xs text-[#667085] md:hidden">Times in New York (ET)</p><PartialFailure errors={data.errors} />{data.hiddenTestCount > 0 && <p className="text-xs text-[#667085]">{data.hiddenTestCount} test case{data.hiddenTestCount === 1 ? " is" : "s are"} hidden. <Link className="font-semibold text-[#14254A] underline" href={queryHref(pathname, params, { hidden: data.showHidden ? null : "1" })}>{data.showHidden ? "Hide" : "Show"}</Link></p>}<div className={cn(view === "week" && "md:hidden")}><NeedsScheduling needs={data.needsScheduling} /></div>{view === "week" ? <><div className="hidden md:block"><WeekGrid data={data} now={now} /></div><div className="md:hidden"><Agenda data={data} now={now} /></div></> : <Agenda data={data} now={now} />}</div>
}
