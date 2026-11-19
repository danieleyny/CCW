"use client"
/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import {
  AlertTriangle,
  CalendarDays,
  Copy,
  Ellipsis,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  createTrainingClass,
  duplicateTrainingClass,
  getRegistrationIdUrl,
  refundRegistration,
  revealVendorAccessCode,
  updateRegistration,
  updateTrainingClass,
} from "@/app/admin/training/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { TRAINING_PLAN_REQUIREMENT } from "@/config/stages"
import { TRAINING_CLASS_PRICE_CENTS } from "@/content/training/config"
import type {
  AdminTrainingClass,
  AdminTrainingData,
  AdminTrainingRegistration,
  TrainingActionResult,
  TrainingClassInput,
  TrainingRegistrationStatus,
} from "@/lib/admin/training"
import { trackEvent } from "@/lib/analytics"
import { formatSessionTime } from "@/lib/training/format"
import type { TrainingSession } from "@/lib/training/types"
import { cn } from "@/lib/utils"

type RosterFilter = "all" | "needs" | "confirmed"
type ConfirmState =
  | { kind: "confirm" | "cancel" | "refund"; registration: AdminTrainingRegistration; course: AdminTrainingClass }
  | { kind: "publish"; course: AdminTrainingClass }
  | null

type ClassDraft = TrainingClassInput

const GROUPS: Array<{ key: AdminTrainingClass["group"]; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "drafts", label: "Drafts" },
  { key: "past", label: "Past" },
]

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100)
}

function calendarDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })
    .format(new Date(`${value}T12:00:00Z`))
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
    .format(new Date(`${value}T12:00:00Z`))
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })
    .format(new Date(value))
}

function classDates(course: AdminTrainingClass) {
  if (!course.sessions.length) return "Dates not set"
  return course.sessions.map((session) => shortDate(session.date)).join(" · ")
}

function firstDateParts(course: AdminTrainingClass) {
  if (!course.firstSessionDate) return { month: "TBD", day: "—" }
  const date = new Date(`${course.firstSessionDate}T12:00:00Z`)
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "America/New_York" }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "America/New_York" }).format(date),
  }
}

function currentStatus(course: AdminTrainingClass) {
  if (course.group === "past") return "closed" as const
  return course.status
}

function StatusChip({ status }: { status: TrainingRegistrationStatus | "open" | "draft" | "closed" }) {
  const label = status === "paid" ? "Paid — enroll" : status.replaceAll("_", " ")
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
      ["confirmed", "open"].includes(status) && "border-[#B7E2CA] bg-[#E8F6EE] text-[#16734A]",
      status === "paid" && "border-[#F2D59A] bg-[#FFF7E6] text-[#805B00]",
      ["enrolled", "draft"].includes(status) && "border-[#B8C4DA] bg-[#EEF2F8] text-[#223A68]",
      ["cancelled", "refunded", "closed", "pending_payment"].includes(status) && "border-[#D0D5DD] bg-[#F2F4F7] text-[#475467]",
    )}>
      {label}
    </span>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-black/10 pl-4 first:border-l-0 first:pl-0">
      <p className="font-[family-name:var(--font-title)] text-[28px] font-semibold leading-none text-[#101828]">{value}</p>
      <p className="mt-2 text-[11px] font-medium text-[#667085]">{label}</p>
    </div>
  )
}

function NeedsBox({ data, onConfirm, onEnroll }: {
  data: AdminTrainingData
  onConfirm: (registration: AdminTrainingRegistration, course: AdminTrainingClass) => void
  onEnroll: (registration: AdminTrainingRegistration) => void
}) {
  if (!data.needs.length) return null
  const classById = new Map(data.classes.map((course) => [course.id, course]))
  return (
    <section className="rounded-2xl border border-[#D9B25F] bg-gradient-to-br from-[#FFFDF7] to-[#FFF8E7] shadow-[0_10px_40px_-30px_rgba(128,91,0,.45)]" aria-labelledby="training-needs-title">
      <header className="flex items-center gap-2 border-b border-[#E7C46F]/60 px-4 py-3 sm:px-5">
        <AlertTriangle className="size-4 text-[#A66B00]" aria-hidden />
        <h2 id="training-needs-title" className="text-sm font-semibold text-[#684B00]">Registrations that need you · {data.needs.length}</h2>
      </header>
      <ul className="divide-y divide-[#E7C46F]/45">
        {data.needs.map((need) => {
          const course = classById.get(need.classId)
          const registration = course?.registrations.find((row) => row.id === need.registrationId)
          if (!course || !registration) return null
          return (
            <li key={need.registrationId} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#101828]">{need.name}</p>
                <p className="mt-0.5 text-xs text-[#667085]">{need.classMonth} class · {need.status === "paid" ? "paid" : need.status} {fullDate(need.date)}</p>
                <p className="mt-1 text-xs font-medium text-[#805B00]">{need.need}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {need.status === "paid" ? <Button size="sm" className="bg-[#14254A] text-white hover:bg-[#1E3563]" onClick={() => onEnroll(registration)}>Enroll</Button> : null}
                {need.status === "enrolled" ? <Button size="sm" className="bg-[#14254A] text-white hover:bg-[#1E3563]" onClick={() => onConfirm(registration, course)}>Confirm…</Button> : null}
                {need.missingId ? <Button asChild size="sm" variant="outline"><a href={`mailto:${need.email}?subject=${encodeURIComponent("Training ID document needed")}`}><Mail className="size-4" />Message</a></Button> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ClassList({ data }: { data: AdminTrainingData }) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-[280px] xl:w-[330px]">
      <div role="listbox" aria-label="Training classes" className="space-y-6">
        {GROUPS.map((group) => {
          const rows = data.classes.filter((course) => course.group === group.key)
          if (!rows.length) return null
          return (
            <section key={group.key} role="group" aria-labelledby={`training-group-${group.key}`}>
              <h2 id={`training-group-${group.key}`} className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-[#667085]">{group.label} · {rows.length}</h2>
              <div className="space-y-2">
                {rows.map((course) => {
                  const date = firstDateParts(course)
                  const selected = course.id === data.selectedId
                  const status = currentStatus(course)
                  const percent = course.capacity ? Math.min(100, (course.activeSeats / course.capacity) * 100) : 0
                  return (
                    <Link
                      key={course.id}
                      href={`/admin/training?class=${course.id}`}
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "grid grid-cols-[54px_minmax(0,1fr)] gap-3 rounded-xl border bg-white p-3 transition-colors",
                        selected ? "border-[#D9B25F] border-l-[4px] bg-[#FFFBF1] shadow-sm" : "border-black/[.08] hover:bg-[#F8F9FB]",
                      )}
                    >
                      <span className={cn(
                        "grid h-[58px] place-content-center rounded-lg text-center",
                        status === "open" && "bg-[#14254A] text-white",
                        status === "draft" && "bg-[#EEF2F8] text-[#223A68]",
                        status === "closed" && "bg-[#F2F4F7] text-[#667085]",
                      )}>
                        <span className="font-mono text-[9px] tracking-[.08em]">{date.month}</span>
                        <span className="font-[family-name:var(--font-title)] text-2xl font-semibold leading-none">{date.day}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-sm leading-tight text-[#101828]">{course.title}</strong><StatusChip status={status} /></span>
                        <span className="mt-1 block text-[10.5px] leading-relaxed text-[#667085]">{classDates(course)} · {course.sessions.length} session{course.sessions.length === 1 ? "" : "s"}{course.sessions[0] ? ` · ${formatSessionTime(course.sessions[0].start, course.sessions[0].end)}` : ""}</span>
                        <span className="mt-2 block">
                          <span className="flex justify-between text-[10px] text-[#667085]"><span>{course.capacity ? `${course.activeSeats}/${course.capacity} seats` : `${course.activeSeats} registered`}</span></span>
                          {course.capacity ? <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#E4E7EC]"><span className="block h-full rounded-full bg-[#D9B25F]" style={{ width: `${percent}%` }} /></span> : null}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

function MobileClassPicker({ data }: { data: AdminTrainingData }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Choose a training class">
      <div className="flex min-w-max gap-2">
        {data.classes.map((course) => {
          const selected = course.id === data.selectedId
          const parts = firstDateParts(course)
          return (
            <Link key={course.id} href={`/admin/training?class=${course.id}`} aria-current={selected ? "page" : undefined} className={cn("rounded-xl border px-3 py-2 text-left", selected ? "border-[#D9B25F] bg-[#FFF8E7]" : "border-black/10 bg-white")}>
              <span className="block font-mono text-[10px] font-semibold text-[#14254A]">{parts.month} {parts.day}</span>
              <span className="mt-1 block text-[10px] text-[#667085]">{course.capacity ? `${course.activeSeats}/${course.capacity}` : `${course.activeSeats} reg.`}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function RegistrationActions({ registration, course, pending, mobile = false, onEnroll, onConfirm, onMore }: {
  registration: AdminTrainingRegistration
  course: AdminTrainingClass
  pending: boolean
  mobile?: boolean
  onEnroll: (registration: AdminTrainingRegistration) => void
  onConfirm: (registration: AdminTrainingRegistration, course: AdminTrainingClass) => void
  onMore: (state: NonNullable<ConfirmState>) => void
}) {
  const canCancel = !["cancelled", "refunded"].includes(registration.status)
  return (
    <div className={cn("flex items-center justify-end gap-2", mobile && "w-full")}>
      {registration.status === "paid" ? <Button size={mobile ? "sm" : "xs"} className={cn(mobile && "flex-1")} disabled={pending} onClick={() => onEnroll(registration)}>Enroll</Button> : null}
      {registration.status === "enrolled" ? <Button size={mobile ? "sm" : "xs"} className={cn(mobile && "flex-1")} disabled={pending} onClick={() => onConfirm(registration, course)}>Confirm…</Button> : null}
      {(canCancel || registration.canRefund) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs" aria-label={`More actions for ${registration.fullName}`}><Ellipsis /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white text-[#101828]">
            {canCancel ? <DropdownMenuItem onSelect={() => onMore({ kind: "cancel", registration, course })}>Cancel registration…</DropdownMenuItem> : null}
            {registration.canRefund ? <DropdownMenuItem variant="destructive" onSelect={() => onMore({ kind: "refund", registration, course })}>Refund…</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function Roster({ course, isPublicOpen, filter, setFilter, pending, onEnroll, onConfirm, onMore, onViewId }: {
  course: AdminTrainingClass
  isPublicOpen: boolean
  filter: RosterFilter
  setFilter: (filter: RosterFilter) => void
  pending: boolean
  onEnroll: (registration: AdminTrainingRegistration) => void
  onConfirm: (registration: AdminTrainingRegistration, course: AdminTrainingClass) => void
  onMore: (state: NonNullable<ConfirmState>) => void
  onViewId: (registration: AdminTrainingRegistration) => void
}) {
  const rows = course.registrations.filter((registration) => {
    if (filter === "confirmed") return registration.status === "confirmed"
    if (filter === "needs") return registration.status === "paid" || registration.status === "enrolled" || !registration.hasId
    return true
  })
  return (
    <section className="mt-7" aria-labelledby="roster-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#667085]">Class roster</p><h3 id="roster-title" className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">Registrations</h3></div>
        <div className="flex rounded-lg border border-black/10 bg-[#F8F9FB] p-1" aria-label="Filter registrations">
          {(["all", "needs", "confirmed"] as RosterFilter[]).map((key) => <button key={key} type="button" onClick={() => setFilter(key)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize", filter === key ? "bg-white text-[#14254A] shadow-sm" : "text-[#667085]")}>{key === "needs" ? "Needs action" : key}</button>)}
        </div>
      </div>
      {!rows.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-black/15 bg-[#FAFAFA] px-5 py-10 text-center">
          <p className="text-sm font-semibold text-[#101828]">{course.registrations.length ? "No registrations match this filter." : "No registrations yet."}</p>
          {!course.registrations.length && isPublicOpen ? <Link href="/#training" className="mt-2 inline-block text-sm font-semibold text-[#14254A] underline underline-offset-4">Share the class page</Link> : null}
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-black/[.08] lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9FB] font-mono text-[9px] uppercase tracking-[.1em] text-[#667085]"><tr><th scope="col" className="px-3 py-3">Name</th><th scope="col" className="hidden px-3 py-3 xl:table-cell">Contact</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-3 py-3">Paid</th><th scope="col" className="px-3 py-3">ID</th><th scope="col" className="px-3 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-black/[.07] bg-white">
                {rows.map((registration) => <tr key={registration.id}>
                  <td className="px-3 py-3"><strong className="block text-[#101828]">{registration.fullName}</strong><span className="mt-0.5 block text-[10.5px] text-[#667085]">Registered {fullDate(registration.createdAt)}</span><span className="mt-1 block text-[10.5px] text-[#667085] xl:hidden">{registration.email}<br />{registration.mobilePhone}</span></td>
                  <td className="hidden px-3 py-3 text-xs text-[#475467] xl:table-cell">{registration.email}<br />{registration.mobilePhone}</td>
                  <td className="px-3 py-3"><StatusChip status={registration.status} /></td>
                  <td className="px-3 py-3 text-xs text-[#475467]">{registration.status === "refunded" ? "Refunded" : registration.paidAt ? `${money(registration.amountCents)} · paid` : "—"}</td>
                  <td className="px-3 py-3">{registration.hasId ? <button type="button" onClick={() => onViewId(registration)} className="text-xs font-semibold text-[#14254A] underline underline-offset-3">View ID</button> : <span className="text-xs font-semibold text-[#B42318]">Missing</span>}</td>
                  <td className="px-3 py-3"><RegistrationActions registration={registration} course={course} pending={pending} onEnroll={onEnroll} onConfirm={onConfirm} onMore={onMore} /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3 lg:hidden">
            {rows.map((registration) => <article key={registration.id} className="rounded-xl border border-black/[.08] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate text-sm font-semibold text-[#101828]">{registration.fullName}</h4><a href={`mailto:${registration.email}`} className="mt-1 block truncate text-xs text-[#667085]">{registration.email}</a></div><StatusChip status={registration.status} /></div>
              <div className="mt-3 grid gap-3 border-t border-black/[.07] pt-3"><span className="text-xs text-[#667085]">{registration.hasId ? <button type="button" onClick={() => onViewId(registration)} className="font-semibold text-[#14254A] underline">View ID</button> : <span className="font-semibold text-[#B42318]">ID missing</span>}</span><RegistrationActions registration={registration} course={course} pending={pending} mobile onEnroll={onEnroll} onConfirm={onConfirm} onMore={onMore} /></div>
            </article>)}
          </div>
        </>
      )}
    </section>
  )
}

function PrivateDetails({ course }: { course: AdminTrainingClass }) {
  const [revealed, setRevealed] = useState<{ code: string; expiresAt: number } | null>(null)
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    if (!revealed) return
    const timer = window.setTimeout(() => setRevealed(null), Math.max(0, revealed.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [revealed])
  function reveal() {
    startTransition(async () => {
      const result = await revealVendorAccessCode(course.id)
      if (!result.ok) { toast.error(result.error); return }
      setRevealed({ code: result.code, expiresAt: result.expiresAt })
    })
  }
  return (
    <details className="mt-7 rounded-xl border border-dashed border-[#B8C4DA] bg-[#F8FAFD] p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-[#14254A]"><span className="flex items-center gap-2"><LockKeyhole className="size-4" />Private details · admins only</span></summary>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium text-[#667085]">Exact address</dt><dd className="mt-1 text-[#101828]">{course.locationPrivate || "Not set"}</dd></div>
        <div><dt className="text-xs font-medium text-[#667085]">Vendor company</dt><dd className="mt-1 text-[#101828]">{course.vendorCompany || "Not set"}</dd></div>
        <div><dt className="text-xs font-medium text-[#667085]">Vendor access code</dt><dd className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[#101828]"><span aria-label={revealed ? "Vendor access code revealed" : "Vendor access code masked"}>{revealed?.code ?? (course.hasVendorCode ? "••••••••" : "Not set")}</span>{course.hasVendorCode ? <button type="button" disabled={pending} onClick={reveal} className="font-sans text-xs font-semibold text-[#14254A] underline">{pending ? "Opening…" : revealed ? "Reveal again" : "Reveal"}</button> : null}</dd></div>
        <div><dt className="text-xs font-medium text-[#667085]">Vendor registration links</dt><dd className="mt-1"><details><summary className="cursor-pointer font-semibold text-[#14254A]">{course.vendorUrls.length} link{course.vendorUrls.length === 1 ? "" : "s"}</summary><ul className="mt-2 space-y-2">{course.vendorUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer" className="break-all text-xs text-[#14254A] underline">{url}</a></li>)}</ul></details></dd></div>
      </dl>
    </details>
  )
}

function ClassDetail({ course, data, onEdit, onPublish, onDuplicate }: {
  course: AdminTrainingClass
  data: AdminTrainingData
  onEdit: () => void
  onPublish: () => void
  onDuplicate: () => void
}) {
  const [filter, setFilter] = useState<RosterFilter>("all")
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [idViewer, setIdViewer] = useState<{ url: string; name: string } | null>(null)
  const [idPending, setIdPending] = useState(false)
  const [pending, startTransition] = useTransition()
  const visualStatus = currentStatus(course)

  function enroll(registration: AdminTrainingRegistration) {
    startTransition(async () => {
      const result = await updateRegistration({ id: registration.id, status: "enrolled" })
      if (!result.ok) { toast.error(result.error); return }
      toast.success(`${registration.fullName} is enrolled.`)
    })
  }
  function openConfirm(registration: AdminTrainingRegistration, selected: AdminTrainingClass) { setConfirm({ kind: "confirm", registration, course: selected }) }
  async function viewId(registration: AdminTrainingRegistration) {
    setIdPending(true)
    const result = await getRegistrationIdUrl(registration.id)
    setIdPending(false)
    if (!result.ok) return toast.error(result.error)
    setIdViewer({ url: result.url, name: result.name })
  }

  return (
    <article className="min-w-0 flex-1 rounded-2xl border border-black/[.08] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:p-6">
      <header className="border-b border-black/[.08] pb-6">
        <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[.13em]", visualStatus === "open" ? "text-[#16734A]" : visualStatus === "draft" ? "text-[#805B00]" : "text-[#667085]")}>{visualStatus === "open" ? "Open for registration" : visualStatus === "draft" ? "Draft — not public" : "Closed"}</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0"><h2 className="font-[family-name:var(--font-title)] text-[28px] font-semibold leading-tight text-[#101828]">{course.title}</h2><p className="mt-2 text-sm leading-relaxed text-[#667085]">{classDates(course)} · {course.locationPublic} (public) · {course.instructorName} · {money(course.priceCents)}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={onDuplicate}><Copy className="size-4" />Duplicate</Button><Button variant="outline" size="sm" onClick={onEdit}><Pencil className="size-4" />Edit</Button>{course.status === "draft" ? <Button size="sm" className="bg-[#14254A] text-white hover:bg-[#1E3563]" onClick={onPublish}>Publish…</Button> : null}</div>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-5 border-b border-black/[.08] py-6 sm:grid-cols-4"><Stat label="Seats filled" value={course.capacity ? `${course.activeSeats}/${course.capacity}` : String(course.activeSeats)} /><Stat label="Paid, not enrolled" value={String(course.paidNotEnrolled)} /><Stat label="Confirmed" value={String(course.confirmed)} /><Stat label="Collected" value={money(course.collectedCents)} /></div>
      <section className="border-b border-black/[.08] py-6" aria-labelledby="sessions-title"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#667085]">Schedule</p><h3 id="sessions-title" className="sr-only">Sessions</h3><div className="mt-3 flex flex-wrap gap-2">{course.sessions.map((session, index) => <span key={`${session.date}-${session.start}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-[#B8C4DA] bg-[#F4F7FB] px-3 py-2 text-xs font-medium text-[#223A68]"><CalendarDays className="size-3.5" />Session {index + 1} · {calendarDate(session.date)} · {formatSessionTime(session.start, session.end)}</span>)}</div></section>
      <Roster course={course} isPublicOpen={visualStatus === "open"} filter={filter} setFilter={setFilter} pending={pending || idPending} onEnroll={enroll} onConfirm={openConfirm} onMore={setConfirm} onViewId={viewId} />
      <PrivateDetails course={course} />
      <ActionDialog state={confirm} setState={setConfirm} stripeMode={data.stripeMode} refundsEnabled={data.refundsEnabled} />
      <Dialog open={Boolean(idViewer)} onOpenChange={(open) => { if (!open) setIdViewer(null) }}><DialogContent className="max-h-[92svh] overflow-y-auto bg-white text-[#101828] sm:max-w-3xl"><DialogHeader><DialogTitle className="font-[family-name:var(--font-title)] text-2xl">{idViewer?.name ?? "Registration ID"}</DialogTitle><DialogDescription>Viewing is logged. This link expires in 60 seconds.</DialogDescription></DialogHeader>{idViewer ? <div className="grid min-h-80 place-items-center rounded-xl bg-[#F2F4F7] p-3">{/* The URL is a 60-second private Supabase signature and cannot use a stable Next image loader. */}<img src={idViewer.url} alt={`Government ID submitted by ${idViewer.name}`} className="max-h-[65svh] max-w-full rounded-lg object-contain shadow-sm" /></div> : null}</DialogContent></Dialog>
    </article>
  )
}

function ActionDialog({ state, setState, stripeMode, refundsEnabled }: { state: ConfirmState; setState: (state: ConfirmState) => void; stripeMode: AdminTrainingData["stripeMode"]; refundsEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function close(open: boolean) { if (!open && !pending) { setError(null); setState(null) } }
  function submit() {
    if (!state) return
    setError(null)
    startTransition(async () => {
      let result: TrainingActionResult
      if (state.kind === "refund") result = await refundRegistration(state.registration.id)
      else if (state.kind === "publish") result = await updateTrainingClass(state.course.id, inputFromCourse(state.course, "open"))
      else result = await updateRegistration({ id: state.registration.id, status: state.kind === "confirm" ? "confirmed" : "cancelled" })
      if (!result.ok) return setError(result.error ?? "Nothing was changed.")
      if (result.warning) toast.warning(result.warning)
      else toast.success(state.kind === "refund" ? "Refund issued." : state.kind === "publish" ? "Class published." : state.kind === "confirm" ? "Seat confirmed and email sent." : "Registration cancelled.")
      setState(null)
    })
  }
  const refundBlocked = state?.kind === "refund" && !refundsEnabled
  const refundBlockMessage = stripeMode === "invalid"
    ? "Training Stripe keys are incomplete or use different modes on this deployment."
    : stripeMode === "live"
      ? "Live training refunds remain disabled until the refund policy is approved."
      : "Training Stripe is not configured for refunds on this deployment."
  return (
    <Dialog open={Boolean(state)} onOpenChange={close}><DialogContent className="bg-white text-[#101828] sm:max-w-lg"><DialogHeader><DialogTitle className="font-[family-name:var(--font-title)] text-2xl font-semibold">
      {state?.kind === "confirm" ? `Confirm ${state.registration.fullName}?` : state?.kind === "refund" ? `Refund ${state.registration.fullName} ${money(state.registration.amountCents)}?` : state?.kind === "cancel" ? `Cancel ${state.registration.fullName}'s registration?` : state?.kind === "publish" ? `Publish the ${state.course.firstSessionDate ? new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "America/New_York" }).format(new Date(`${state.course.firstSessionDate}T12:00:00Z`)) : "selected"} class?` : "Confirm action"}
    </DialogTitle><DialogDescription>{state?.kind === "confirm" ? "Sends the confirmation email with the exact class address." : state?.kind === "refund" ? "Refunds the card used for this registration through Stripe." : state?.kind === "cancel" ? "No money is returned. To return money, use Refund." : state?.kind === "publish" ? "It becomes visible and open for registration on the public site." : ""}</DialogDescription></DialogHeader>
      {state?.kind === "confirm" ? <div className="rounded-xl border border-black/10 bg-[#F8F9FB] p-4 text-sm"><strong>{state.course.title}</strong><p className="mt-1 text-[#667085]">{classDates(state.course)} · {state.course.locationPrivate || "Exact address not set"}</p></div> : null}
      {state?.kind === "refund" ? <div className="rounded-xl border border-[#F4B8B2] bg-[#FFF3F2] p-4 text-sm text-[#912018]"><strong>This can&apos;t be undone.</strong><p className="mt-1">{state.registration.fullName}&apos;s seat is released and the status becomes Refunded.</p>{refundBlocked ? <p className="mt-3 font-semibold">{refundBlockMessage}</p> : null}</div> : null}
      {error ? <p role="alert" className="rounded-xl bg-[#FFF3F2] p-3 text-sm font-medium text-[#B42318]">{error}</p> : null}
      <DialogFooter className="bg-[#F8F9FB]"><Button variant="outline" disabled={pending} onClick={() => close(false)}>Cancel</Button><Button variant={state?.kind === "refund" ? "destructive" : "default"} disabled={pending || refundBlocked} onClick={submit}>{pending ? "Working…" : state?.kind === "confirm" ? "Confirm & send email" : state?.kind === "refund" ? `Refund ${money(state.registration.amountCents)}` : state?.kind === "publish" ? "Publish class" : "Cancel registration"}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function baseSlug(date: string) {
  const source = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : new Date().toISOString().slice(0, 7)
  return `ccw-${source}`
}

function uniqueSlug(base: string, taken: string[], current?: string) {
  const unavailable = new Set(taken.filter((slug) => slug !== current))
  if (!unavailable.has(base)) return base
  for (let suffix = 2; suffix < 100; suffix += 1) if (!unavailable.has(`${base}-${suffix}`)) return `${base}-${suffix}`
  return `${base}-${Date.now().toString().slice(-4)}`
}

function emptyDraft(taken: string[]): ClassDraft {
  const session = { date: "", start: "17:00", end: "22:00", label: "Session 1" }
  return { slug: uniqueSlug(baseSlug(session.date), taken), title: "NYS CCW Licensing Class", sessions: [session], locationPublic: "Manhattan", locationPrivate: "", priceDollars: TRAINING_CLASS_PRICE_CENTS / 100, capacity: null, status: "draft", instructorName: "Yariv Ben-Ari", vendorCompany: "50B EDC Training & Consulting LLC", vendorUrls: [], vendorAccessCode: "" }
}

function inputFromCourse(course: AdminTrainingClass, status = course.status): ClassDraft {
  return { slug: course.slug, title: course.title, sessions: course.sessions, locationPublic: course.locationPublic, locationPrivate: course.locationPrivate ?? "", priceDollars: course.priceCents / 100, capacity: course.capacity, status, instructorName: course.instructorName, vendorCompany: course.vendorCompany, vendorUrls: course.vendorUrls, vendorAccessCode: "" }
}

function durationHours(sessions: TrainingSession[]) {
  return sessions.reduce((total, session) => {
    const [startHour = 0, startMinute = 0] = session.start.split(":").map(Number)
    const [endHour = 0, endMinute = 0] = session.end.split(":").map(Number)
    return total + Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60)
  }, 0)
}

function ClassEditor({ open, onOpenChange, course, takenSlugs, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; course: AdminTrainingClass | null; takenSlugs: string[]; onSaved: (id: string) => void }) {
  const initial = useMemo(() => course ? inputFromCourse(course) : emptyDraft(takenSlugs), [course, takenSlugs])
  const [draft, setDraft] = useState<ClassDraft>(initial)
  const [step, setStep] = useState(1)
  const [slugEditable, setSlugEditable] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function resetAndClose(next: boolean) {
    if (next) { setDraft(initial); setStep(1); setSlugEditable(false); setErrors({}) }
    if (!next && pending) return
    onOpenChange(next)
  }
  function patch(next: Partial<ClassDraft>) { setDraft((current) => ({ ...current, ...next })) }
  function changeSession(index: number, update: Partial<TrainingSession>) {
    setDraft((current) => {
      const sessions = current.sessions.map((session, i) => i === index ? { ...session, ...update } : session)
      const slug = !slugEditable && update.date && index === 0 ? uniqueSlug(baseSlug(update.date), takenSlugs, course?.slug) : current.slug
      return { ...current, sessions, slug }
    })
  }
  function validate(currentStep = step) {
    const next: Record<string, string> = {}
    if (currentStep === 1) {
      if (draft.title.trim().length < 2) next.title = "Enter a class title."
      if (draft.instructorName.trim().length < 2) next.instructorName = "Enter the instructor name."
      if (!/^[a-z0-9-]+$/.test(draft.slug)) next.slug = "Use lowercase letters, numbers and hyphens."
    }
    if (currentStep === 2) draft.sessions.forEach((session, index) => {
      if (!session.date) next[`session-${index}`] = "Choose a date."
      else if (!session.start || !session.end || session.end <= session.start) next[`session-${index}`] = "End time must be after start time."
    })
    if (currentStep === 3) {
      if (draft.locationPublic.trim().length < 2) next.locationPublic = "Enter the public area."
      if (!Number.isFinite(draft.priceDollars) || draft.priceDollars < 0) next.priceDollars = "Enter a valid price."
      if (draft.capacity != null && (!Number.isInteger(draft.capacity) || draft.capacity < 1)) next.capacity = "Capacity must be a whole number."
    }
    if (currentStep === 4) draft.vendorUrls.forEach((url, index) => { try { new URL(url) } catch { next[`url-${index}`] = "Enter a complete URL, including https://" } })
    setErrors(next)
    return Object.keys(next).length === 0
  }
  function next() { if (validate()) setStep((value) => Math.min(4, value + 1)) }
  function save(status: "draft" | "open") {
    if (![1, 2, 3, 4].every((value) => validate(value))) return
    startTransition(async () => {
      const input = { ...draft, status }
      const result = course ? await updateTrainingClass(course.id, input) : await createTrainingClass(input)
      if (!result.ok || !result.id) return setErrors({ submit: result.error ?? "The class wasn't saved." })
      if (!course) trackEvent("admin_training_class_created", { via: "new" })
      toast.success(course ? "Class updated." : "Class created.")
      onOpenChange(false)
      onSaved(result.id)
    })
  }
  const totalHours = durationHours(draft.sessions)
  return (
    <Dialog open={open} onOpenChange={resetAndClose}><DialogContent className="h-[100svh] max-h-none w-screen max-w-none overflow-y-auto rounded-none bg-white p-0 text-[#101828] sm:h-auto sm:max-h-[92svh] sm:w-[min(900px,calc(100vw-2rem))] sm:rounded-2xl sm:p-0">
      <DialogHeader className="border-b border-black/10 px-5 py-5 sm:px-7"><DialogTitle className="font-[family-name:var(--font-title)] text-2xl font-semibold">{course ? "Edit class" : "New class"}</DialogTitle><DialogDescription>Step {step} of 4 · {step === 1 ? "Basics" : step === 2 ? "Sessions" : step === 3 ? "Place & price" : "Private & review"}</DialogDescription></DialogHeader>
      <div className="px-5 py-5 sm:px-7">
        <div className="grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>{[1, 2, 3, 4].map((value) => <div key={value} className={cn("h-1.5 rounded-full", value <= step ? "bg-[#D9B25F]" : "bg-[#E4E7EC]")} />)}</div>
        {step === 1 ? <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field id="training-title" label="Title" error={errors.title} className="sm:col-span-2"><Input id="training-title" value={draft.title} onChange={(event) => patch({ title: event.target.value })} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "training-title-error" : undefined} /></Field>
          <Field id="training-instructor" label="Instructor name" error={errors.instructorName}><Input id="training-instructor" value={draft.instructorName} onChange={(event) => patch({ instructorName: event.target.value })} aria-invalid={Boolean(errors.instructorName)} aria-describedby={errors.instructorName ? "training-instructor-error" : undefined} /></Field>
          <Field id="training-vendor" label="Vendor company"><Input id="training-vendor" value={draft.vendorCompany} onChange={(event) => patch({ vendorCompany: event.target.value })} /></Field>
          <Field id="training-slug" label="Public class URL" error={errors.slug} className="sm:col-span-2"><div className="flex gap-2"><Input id="training-slug" value={draft.slug} readOnly={!slugEditable} onChange={(event) => patch({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} aria-invalid={Boolean(errors.slug)} aria-describedby={errors.slug ? "training-slug-error" : "training-slug-help"} /><Button type="button" variant="outline" onClick={() => setSlugEditable((value) => !value)}>{slugEditable ? "Lock" : "Edit"}</Button></div><p id="training-slug-help" className="mt-1 text-xs text-[#667085]">Generated from the first session&apos;s year and month.</p></Field>
        </div> : null}
        {step === 2 ? <div className="mt-7 space-y-4">
          {draft.sessions.map((session, index) => <div key={index} className="rounded-xl border border-black/10 bg-[#F8F9FB] p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#101828]">Session {index + 1}</strong>{draft.sessions.length > 1 ? <Button type="button" variant="ghost" size="icon-xs" onClick={() => patch({ sessions: draft.sessions.filter((_, i) => i !== index).map((row, i) => ({ ...row, label: `Session ${i + 1}` })) })} aria-label={`Remove session ${index + 1}`}><Trash2 /></Button> : null}</div><div className="mt-3 grid gap-3 sm:grid-cols-4"><Field id={`training-session-${index}-date`} label="Date" error={errors[`session-${index}`]}><Input id={`training-session-${index}-date`} type="date" value={session.date} onChange={(event) => changeSession(index, { date: event.target.value })} aria-invalid={Boolean(errors[`session-${index}`])} aria-describedby={errors[`session-${index}`] ? `training-session-${index}-date-error` : undefined} /></Field><Field id={`training-session-${index}-start`} label="Start"><Input id={`training-session-${index}-start`} type="time" value={session.start} onChange={(event) => changeSession(index, { start: event.target.value })} /></Field><Field id={`training-session-${index}-end`} label="End"><Input id={`training-session-${index}-end`} type="time" value={session.end} onChange={(event) => changeSession(index, { end: event.target.value })} /></Field><Field id={`training-session-${index}-label`} label="Label"><Input id={`training-session-${index}-label`} value={session.label} onChange={(event) => changeSession(index, { label: event.target.value })} /></Field></div></div>)}
          <Button type="button" variant="outline" onClick={() => patch({ sessions: [...draft.sessions, { date: "", start: "17:00", end: "22:00", label: `Session ${draft.sessions.length + 1}` }] })}><Plus className="size-4" />Add session</Button>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#EEF2F8] p-4 text-sm text-[#223A68]"><strong>{draft.sessions.length} session{draft.sessions.length === 1 ? "" : "s"} · {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)} hours</strong><p className="mt-1 text-xs">Calculated from the times above.</p></div><div className="rounded-xl border border-[#E7C46F] bg-[#FFF8E7] p-4 text-sm text-[#684B00]"><strong>{TRAINING_PLAN_REQUIREMENT}</strong><p className="mt-1 text-xs">Check the plan with the instructor. This note does not block saving.</p></div></div>
        </div> : null}
        {step === 3 ? <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field id="training-public-location" label="Public location" error={errors.locationPublic}><Input id="training-public-location" value={draft.locationPublic} onChange={(event) => patch({ locationPublic: event.target.value })} placeholder="Manhattan" aria-invalid={Boolean(errors.locationPublic)} aria-describedby={errors.locationPublic ? "training-public-location-error" : undefined} /></Field>
          <Field id="training-private-location" label="Exact address (private)"><Input id="training-private-location" value={draft.locationPrivate} onChange={(event) => patch({ locationPrivate: event.target.value })} placeholder="Only admins and confirmed registrants see this" /></Field>
          <Field id="training-price" label="Price in dollars" error={errors.priceDollars}><Input id="training-price" type="number" min="0" step="1" value={draft.priceDollars} onChange={(event) => patch({ priceDollars: Number(event.target.value) })} aria-invalid={Boolean(errors.priceDollars)} aria-describedby={errors.priceDollars ? "training-price-error" : undefined} /></Field>
          <Field id="training-capacity" label="Capacity (optional)" error={errors.capacity}><Input id="training-capacity" type="number" min="1" step="1" value={draft.capacity ?? ""} onChange={(event) => patch({ capacity: event.target.value ? Number(event.target.value) : null })} aria-invalid={Boolean(errors.capacity)} aria-describedby={errors.capacity ? "training-capacity-error" : undefined} /></Field>
        </div> : null}
        {step === 4 ? <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="space-y-5"><Field id="training-vendor-code" label="Vendor access code (private)"><Input id="training-vendor-code" type="password" value={draft.vendorAccessCode} onChange={(event) => patch({ vendorAccessCode: event.target.value })} placeholder={course?.hasVendorCode ? "Stored — leave blank to keep" : "Optional"} /></Field><Field id="training-vendor-urls" label="Vendor registration URLs"><textarea id="training-vendor-urls" value={draft.vendorUrls.join("\n")} onChange={(event) => patch({ vendorUrls: event.target.value.split("\n").map((row) => row.trim()).filter(Boolean) })} rows={6} className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#7486A8] focus:ring-2 focus:ring-[#7486A8]/30" placeholder="https://vendor.example/class\nOne per line" />{Object.entries(errors).filter(([key]) => key.startsWith("url-")).map(([key, error]) => <p key={key} className="mt-1 text-xs text-[#B42318]">{error}</p>)}</Field></div>
          <div className="rounded-xl border border-black/10 bg-[#F8F9FB] p-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#667085]">Review</p><h3 className="mt-2 font-[family-name:var(--font-title)] text-2xl font-semibold">{draft.title}</h3><dl className="mt-4 space-y-3 text-sm"><ReviewRow label="Dates" value={draft.sessions.filter((row) => row.date).map((row) => shortDate(row.date)).join(" · ") || "Not set"} /><ReviewRow label="Sessions" value={`${draft.sessions.length} · ${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)} hours`} /><ReviewRow label="Place" value={draft.locationPublic || "Not set"} /><ReviewRow label="Price" value={money(Math.round(draft.priceDollars * 100))} /><ReviewRow label="Capacity" value={draft.capacity ? String(draft.capacity) : "No limit set"} /><ReviewRow label="Instructor" value={draft.instructorName || "Not set"} /></dl></div>
        </div> : null}
        {errors.submit ? <p role="alert" className="mt-5 rounded-xl bg-[#FFF3F2] p-3 text-sm font-medium text-[#B42318]">{errors.submit}</p> : null}
      </div>
      <DialogFooter className="sticky bottom-0 mt-auto bg-white px-5 py-4 sm:px-7"><Button type="button" variant="outline" disabled={pending} onClick={() => step === 1 ? resetAndClose(false) : setStep((value) => value - 1)}>{step === 1 ? "Cancel" : "Back"}</Button>{step < 4 ? <Button type="button" disabled={pending} onClick={next}>Next</Button> : <><Button type="button" variant="outline" disabled={pending} onClick={() => save("open")}>Save as Open</Button><Button type="button" disabled={pending} onClick={() => save("draft")}>{pending ? "Saving…" : "Save as Draft"}</Button></>}</DialogFooter>
      {step === 4 ? <p className="px-5 pb-5 text-center text-xs text-[#667085] sm:px-7">Open classes are visible on the public site.</p> : null}
    </DialogContent></Dialog>
  )
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <div className={cn("block", className)}><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#475467]">{label}</label>{children}{error ? <p id={`${id}-error`} className="mt-1 text-xs text-[#B42318]">{error}</p> : null}</div>
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-5 border-b border-black/[.07] pb-2"><dt className="text-[#667085]">{label}</dt><dd className="text-right font-medium text-[#101828]">{value}</dd></div>
}

export function AdminTrainingWorkspace({ data }: { data: AdminTrainingData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = data.classes.find((course) => course.id === data.selectedId) ?? null
  const [editor, setEditor] = useState<{ open: boolean; course: AdminTrainingClass | null }>({ open: false, course: null })
  const [publish, setPublish] = useState<ConfirmState>(null)
  const [pending, startTransition] = useTransition()

  function select(id: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set("class", id)
    router.push(`${pathname}?${next}`)
  }
  function enroll(registration: AdminTrainingRegistration) {
    startTransition(async () => {
      const result = await updateRegistration({ id: registration.id, status: "enrolled" })
      if (!result.ok) { toast.error(result.error); return }
      toast.success(`${registration.fullName} is enrolled.`)
    })
  }
  function duplicate() {
    if (!selected) return
    startTransition(async () => {
      const result = await duplicateTrainingClass(selected.id)
      if (!result.ok || !result.id) { toast.error(result.error); return }
      trackEvent("admin_training_class_created", { via: "duplicate" })
      toast.success("Duplicated as draft.", { action: { label: "Open copy", onClick: () => select(result.id!) } })
      select(result.id)
    })
  }
  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 pb-12 text-[#101828]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.15em] text-[#667085]">Operations / Training</p><h1 className="mt-2 font-[family-name:var(--font-title)] text-[38px] font-semibold leading-none">Training</h1><p className="mt-3 text-sm text-[#667085]">Public CCW classes, their sessions and who&apos;s registered. Admins only.</p></div><Button className="w-full bg-[#14254A] text-white hover:bg-[#1E3563] sm:w-auto" onClick={() => setEditor({ open: true, course: null })}><Plus className="size-4" />New class</Button></header>
      <NeedsBox data={data} onEnroll={enroll} onConfirm={(registration, course) => setPublish({ kind: "confirm", registration, course })} />
      {!data.classes.length ? <section className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-20 text-center"><CalendarDays className="mx-auto size-9 text-[#667085]" /><h2 className="mt-4 font-[family-name:var(--font-title)] text-3xl font-semibold">Create your first class</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[#667085]">Set the sessions, public location and private instructor details in one guided flow.</p><Button className="mt-5 bg-[#14254A] text-white" onClick={() => setEditor({ open: true, course: null })}><Plus className="size-4" />New class</Button></section> : <><MobileClassPicker data={data} /><div className="flex items-start gap-5"><ClassList data={data} />{selected ? <ClassDetail key={selected.id} course={selected} data={data} onEdit={() => setEditor({ open: true, course: selected })} onPublish={() => setPublish({ kind: "publish", course: selected })} onDuplicate={duplicate} /> : null}</div></>}
      {editor.open ? <ClassEditor open onOpenChange={(open) => setEditor((current) => ({ ...current, open }))} course={editor.course} takenSlugs={data.takenSlugs} onSaved={select} /> : null}
      <ActionDialog state={publish} setState={setPublish} stripeMode={data.stripeMode} refundsEnabled={data.refundsEnabled} />
      {pending ? <span className="sr-only" role="status">Updating training data…</span> : null}
    </main>
  )
}
