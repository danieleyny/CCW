import Link from "next/link"
import { ArrowRight, CalendarDays, CheckCircle2, Clock, FileCheck2, ShieldCheck, UserRound } from "lucide-react"
import type { CasePreviewData } from "@/app/admin/cases/preview-actions"
import type { MessageRow } from "@/components/shared/message-thread"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface OverviewProps {
  caseId: string
  preview: CasePreviewData
  messages: MessageRow[]
  unreadMessages: number
  pinnedNote: { body: string; authorName: string | null } | null
  clientIdleDays: number | null
  trainingExpiresOn: string | null
  trainingDaysLeft: number | null
  nextAppointment: { type: string; scheduled_at: string; location: string | null } | null
  openTasks: number
  overdueTasks: number
  paymentSummary: string
  filedAt: string | null
  nypdRef: string | null
  licenseIssuedOn: string | null
  licenseExpiresOn: string | null
  concierge?: React.ReactNode
}

export function CaseOverview(props: OverviewProps) {
  const staffMove = props.preview.whoseMove === "Staff"
  const nextHref = staffMove ? props.preview.nextHref : `/admin/cases/${props.caseId}?tab=checklist`
  const nextLabel = staffMove ? props.preview.nextAction : "Open checklist"

  return (
    <div className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-[18px]">
        <section className="rounded-2xl border border-brass/35 bg-gradient-to-br from-brass/12 via-brass/5 to-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ArrowRight className="size-5" /></span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-brass-bright">{props.preview.whoseMove}&apos;s move</p>
                <h2 className="mt-1 font-display text-[21px] leading-tight">Next: {props.preview.nextStep}</h2>
                <p className="mt-1 text-sm text-text-mid">
                  {staffMove ? "This is the clearest action your team can take to move the case forward." : `Waiting on ${props.preview.whoseMove.toLowerCase()}; the checklist remains the source of truth.`}
                </p>
              </div>
            </div>
            <Link href={nextHref} className={cn("inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold", staffMove ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-hairline bg-card hover:bg-surface-2")}>
              {nextLabel} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {props.preview.isLead ? (
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-text-low">Lead status</p>
            <h2 className="mt-1 font-display text-xl">Not enrolled yet</h2>
            <p className="mt-2 text-sm text-text-mid">
              {props.preview.lastStep ?? "The applicant has not completed enrollment."}{props.preview.pendingAmount ? ` · ${props.preview.pendingAmount} requested.` : ""}
            </p>
            <p className="mt-3 text-xs text-text-low">No filing checklist is shown until the applicant has selected a path and enrolled.</p>
          </section>
        ) : props.preview.openBeforeFiling ? (
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-text-low">Before filing</p>
                <h2 className="mt-1 font-display text-xl">Still open · {props.preview.openBeforeFiling.total}</h2>
              </div>
              <Link href={`/admin/cases/${props.caseId}?tab=checklist`} className="text-sm font-medium text-signal hover:underline">Full checklist ›</Link>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {props.preview.openBeforeFiling.boxes.map((box) => (
                <Link key={box.label} href={`/admin/cases/${props.caseId}?tab=checklist&group=${encodeURIComponent(box.label)}`} className="rounded-xl border border-hairline bg-surface-1 p-3 transition-colors hover:border-brass/40 hover:bg-brass/5">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-text-mid">{box.label}</span><b className="font-display text-xl">{box.count}</b></div>
                  <ul className="mt-2 space-y-1.5 text-xs text-text-mid">
                    {box.titles.map((title) => <li key={title} className="flex items-start justify-between gap-2"><span className="line-clamp-2">{title}</span><ArrowRight className="mt-0.5 size-3.5 shrink-0" /></li>)}
                    {box.count === 0 && <li className="flex items-center gap-1.5 text-ok"><CheckCircle2 className="size-3.5" /> Nothing waiting</li>}
                  </ul>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-hairline bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-text-low">Filing &amp; NYPD</p>
            <h2 className="mt-1 font-display text-xl">Agency milestones</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Filed" value={props.filedAt ? formatDate(props.filedAt) : "Not recorded"} />
              <Info label="NYPD reference" value={props.nypdRef ?? "Not recorded"} mono />
              <Info label="Next appointment" value={props.nextAppointment ? `${props.nextAppointment.type.replaceAll("_", " ")} · ${formatDateTime(props.nextAppointment.scheduled_at)}` : "None scheduled"} />
              <Info label="License" value={props.licenseIssuedOn ? `Issued ${formatDate(props.licenseIssuedOn)}${props.licenseExpiresOn ? ` · expires ${formatDate(props.licenseExpiresOn)}` : ""}` : "Not issued"} />
            </dl>
          </section>
        )}

        {props.concierge}
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <section className="rounded-2xl border border-hairline bg-card p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg">Messages</h2>{props.unreadMessages > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">{props.unreadMessages} unread</span>}</div>
          <ul className="mt-3 space-y-2">
            {props.messages.slice(-2).map((message) => {
              const client = message.senderRole === "client"
              return <li key={message.id} className={cn("rounded-xl p-3 text-xs", client ? "bg-signal/8" : "bg-surface-2")}><div className="mb-1 flex justify-between gap-2 font-medium"><span>{client ? "Client" : message.senderName ?? "Staff"}</span><span className="font-normal text-text-low">{formatDateTime(message.created_at)}</span></div><p className="line-clamp-3 whitespace-pre-wrap text-text-mid">{message.body}</p></li>
            })}
            {props.messages.length === 0 && <li className="rounded-xl border border-dashed p-4 text-center text-xs text-text-low">No messages yet.</li>}
          </ul>
          <Link href={`/admin/cases/${props.caseId}?tab=messages`} className="mt-3 inline-flex text-sm font-medium text-signal hover:underline">Reply ›</Link>
        </section>

        {props.pinnedNote && (
          <section className="rounded-2xl border border-warn/25 bg-warn/8 p-4">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg">Pinned note</h2><span className="text-[10px] font-semibold uppercase tracking-wide text-warn">Staff-only</span></div>
            <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-text-mid">{props.pinnedNote.body}</p>
            <Link href={`/admin/cases/${props.caseId}?tab=notes`} className="mt-2 inline-flex text-sm font-medium text-signal hover:underline">Notes ›</Link>
          </section>
        )}

        <section className="rounded-2xl border border-hairline bg-card p-4">
          <h2 className="font-display text-lg">Vitals</h2>
          <dl className="mt-3 divide-y divide-hairline text-sm">
            <Vital icon={UserRound} label="Client last active" value={props.clientIdleDays == null ? "No activity yet" : `${props.clientIdleDays}d ago`} warn={props.clientIdleDays != null && props.clientIdleDays > 7} />
            <Vital icon={ShieldCheck} label="Training valid until" value={props.trainingExpiresOn ? formatDate(props.trainingExpiresOn) : "Not recorded"} warn={props.trainingDaysLeft != null && props.trainingDaysLeft <= 30} danger={props.trainingDaysLeft != null && props.trainingDaysLeft < 0} />
            <Vital icon={CalendarDays} label="Next appointment" value={props.nextAppointment ? formatDateTime(props.nextAppointment.scheduled_at) : "None scheduled"} />
            <Vital icon={Clock} label="Open tasks" value={`${props.openTasks}${props.overdueTasks ? ` · ${props.overdueTasks} overdue` : ""}`} warn={props.overdueTasks > 0} />
            <Vital icon={FileCheck2} label="Payments" value={props.paymentSummary} />
          </dl>
        </section>

        <section className="rounded-2xl border border-hairline bg-card p-4">
          <h2 className="font-display text-lg">Recent activity</h2>
          <ul className="mt-3 space-y-3">
            {props.preview.activity.map((activity) => <li key={activity.id} className="flex gap-2 text-xs"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass" /><div><p className="text-text-mid">{activity.line}</p><p className="mt-0.5 text-text-low">{formatDateTime(activity.at)}</p></div></li>)}
            {props.preview.activity.length === 0 && <li className="text-xs text-text-low">No activity yet.</li>}
          </ul>
          <Link href={`/admin/cases/${props.caseId}?tab=activity`} className="mt-3 inline-flex text-sm font-medium text-signal hover:underline">All activity ›</Link>
        </section>
      </aside>
    </div>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl bg-surface-2 p-3"><dt className="text-[10px] uppercase tracking-wide text-text-low">{label}</dt><dd className={cn("mt-1 font-medium capitalize", mono && "font-mono")}>{value}</dd></div>
}

function Vital({ icon: Icon, label, value, warn, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; warn?: boolean; danger?: boolean }) {
  return <div className="flex items-center gap-2 py-2.5"><Icon className="size-4 shrink-0 text-text-low" /><dt className="min-w-0 flex-1 text-text-mid">{label}</dt><dd className={cn("text-right text-xs font-medium", warn && "text-warn", danger && "text-danger")}>{value}</dd></div>
}
