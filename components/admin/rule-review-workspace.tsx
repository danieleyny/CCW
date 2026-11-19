"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileWarning,
  Flag,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import {
  flagRequirementForReview,
  markRequirementVerified,
  setRequirementLegalStatus,
} from "@/app/admin/legal/actions"
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
import { Textarea } from "@/components/ui/textarea"
import type { TemplateWarning } from "@/lib/forms/drift"
import type { LegalStatus } from "@/lib/legal-status"
import type { RuleReviewCounts, RuleReviewStatus } from "@/lib/admin/rule-review-model"
import { cn } from "@/lib/utils"

export interface RuleReviewVersion {
  id: string
  jurisdictionKey: string
  jurisdictionLabel: string
  status: RuleReviewStatus
  legalStatus: LegalStatus
  legalStatusNote: string | null
  citation: string | null
  sourceUrl: string | null
  authority: string | null
  effectiveFrom: string
  version: number
  changedSummary: string | null
  verifiedByName: string | null
  verifiedOn: string | null
  blocking: boolean
}

export interface RuleReviewGroup {
  reqCode: string
  title: string
  description: string | null
  severity: string
  triggerCond: string
  topicKey: string
  topicLabel: string
  status: RuleReviewStatus
  mixedStatusTooltip: string | null
  versions: RuleReviewVersion[]
}

export interface RecentRuleReview {
  reqCode: string
  staffName: string
  reviewedOn: string
}

interface RuleReviewWorkspaceProps {
  groups: RuleReviewGroup[]
  counts: RuleReviewCounts
  templateWarnings: TemplateWarning[]
  recent: RecentRuleReview[]
  filter: string
  topic: string
  mode: string
  rule: string
}

const STATUS_META: Record<RuleReviewStatus, { label: string; chip: string; bar: string }> = {
  needs_review: {
    label: "Needs review",
    chip: "bg-[var(--staff-amber-bg)] text-[var(--staff-amber)]",
    bar: "bg-[var(--staff-gold)]",
  },
  stale: {
    label: "Stale — review again",
    chip: "bg-[var(--staff-red-bg)] text-[var(--staff-red)]",
    bar: "bg-[var(--staff-red)]",
  },
  not_enforced: {
    label: "Not enforced",
    chip: "bg-[var(--staff-slate-bg)] text-[var(--staff-slate)]",
    bar: "bg-[var(--staff-slate)]",
  },
  reviewed: {
    label: "Reviewed",
    chip: "bg-[var(--staff-green-bg)] text-[var(--staff-green)]",
    bar: "bg-[var(--staff-green)]",
  },
}

const ENFORCEMENT_OPTIONS: Array<{ value: LegalStatus; label: string }> = [
  { value: "enforced", label: "Enforced" },
  { value: "enjoined_not_enforced", label: "Enjoined" },
  { value: "contested", label: "Contested" },
  { value: "repealed", label: "Repealed" },
]

const FILTERS = [
  ["attention", "Needs attention"],
  ["needs", "Needs review"],
  ["stale", "Stale"],
  ["not-enforced", "Not enforced"],
  ["reviewed", "Reviewed"],
] as const

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function nextDueDate(value: string) {
  const due = new Date(`${value}T12:00:00.000Z`)
  due.setUTCDate(due.getUTCDate() + 90)
  return due.toISOString().slice(0, 10)
}

function shortJurisdiction(label: string) {
  if (label === "New York City") return "NYC"
  if (label === "Special / Non-Resident Carry") return "Special / Non-Resident"
  return label
}

function statusButtonLabel(status: RuleReviewStatus) {
  if (status === "stale") return "Review again…"
  if (status === "not_enforced") return "Review status…"
  return "Review…"
}

function enforcementLabel(status: LegalStatus) {
  if (status === "enjoined_not_enforced") return "Enjoined"
  if (status === "contested") return "Contested"
  if (status === "repealed") return "Repealed"
  return "Enforced"
}

function StatusChip({ status, title, label }: { status: RuleReviewStatus; title?: string; label?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      title={title}
      className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.chip)}
    >
      {label ?? meta.label}
    </span>
  )
}

function JurisdictionChips({ versions }: { versions: RuleReviewVersion[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {versions.map((version) => (
        <span
          key={version.id}
          title={`${shortJurisdiction(version.jurisdictionLabel)}: ${STATUS_META[version.status].label}`}
          className="rounded-full border border-[var(--staff-line)] bg-[var(--staff-paper)] px-2 py-0.5 text-[10px] font-semibold text-[var(--staff-slate)]"
        >
          {shortJurisdiction(version.jurisdictionLabel)}
        </span>
      ))}
    </span>
  )
}

function ProgressRing({ reviewed, total }: { reviewed: number; total: number }) {
  const pct = total ? Math.round((reviewed / total) * 100) : 100
  const radius = 42
  const circumference = 2 * Math.PI * radius
  return (
    <div role="img" aria-label={`${reviewed} of ${total} rules reviewed`} className="relative size-28 shrink-0">
      <svg viewBox="0 0 104 104" className="size-full -rotate-90" aria-hidden>
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--staff-line-on-dark)" strokeWidth="8" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="var(--staff-gold)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-semibold text-white">{pct}%</span>
    </div>
  )
}

function CountCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "amber" | "red" | "slate" | "green" }) {
  const toneClass = {
    amber: "text-[var(--staff-amber)]",
    red: "text-[var(--staff-red)]",
    slate: "text-[var(--staff-slate)]",
    green: "text-[var(--staff-green)]",
  }[tone]
  return (
    <div className="rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-4 shadow-sm">
      <p className="text-xs font-semibold text-[var(--staff-muted)]">{label}</p>
      <p className={cn("mt-2 font-[family-name:var(--font-title)] text-4xl leading-none", toneClass)}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--staff-muted)]">{detail}</p>
    </div>
  )
}

function filterHref(filter: string, topic: string) {
  const params = new URLSearchParams()
  if (filter !== "attention") params.set("status", filter)
  if (topic !== "all") params.set("topic", topic)
  return `/admin/legal${params.size ? `?${params.toString()}` : ""}`
}

function actionHref(reqCode: string) {
  return `/admin/legal?mode=review&rule=${encodeURIComponent(reqCode)}`
}

function RuleList({ groups, filter, topic }: { groups: RuleReviewGroup[]; filter: string; topic: string }) {
  const visible = groups.filter((group) => {
    const matchesTopic = topic === "all" || group.topicKey === topic
    if (!matchesTopic) return false
    if (filter === "needs") return group.status === "needs_review"
    if (filter === "stale") return group.status === "stale"
    if (filter === "not-enforced") return group.status === "not_enforced"
    if (filter === "reviewed") return group.status === "reviewed"
    return group.status !== "reviewed"
  })

  const statusOrder: Record<RuleReviewStatus, number> = { needs_review: 0, stale: 1, not_enforced: 2, reviewed: 3 }
  visible.sort((a, b) => {
    const status = statusOrder[a.status] - statusOrder[b.status]
    if (status) return status
    if (a.status === "stale") {
      const aDate = a.versions.map((v) => v.verifiedOn ?? "").sort()[0]
      const bDate = b.versions.map((v) => v.verifiedOn ?? "").sort()[0]
      if (aDate !== bDate) return aDate.localeCompare(bDate)
    }
    return a.reqCode.localeCompare(b.reqCode)
  })

  if (!visible.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--staff-line)] bg-[var(--staff-paper)] px-6 py-12 text-center">
        <CheckCircle2 className="mx-auto size-8 text-[var(--staff-green)]" />
        <h2 className="mt-3 font-[family-name:var(--font-title)] text-2xl text-[var(--staff-ink)]">Nothing in this view</h2>
        <p className="mt-2 text-sm text-[var(--staff-muted)]">Choose another status or topic.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] shadow-sm">
      <ul className="divide-y divide-[var(--staff-line)]">
        {visible.map((group) => {
          const primary = group.versions[0]
          const citation = primary.citation ?? primary.authority ?? "No citation recorded"
          return (
            <li key={group.reqCode} className="p-4 sm:p-5">
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--staff-slate-bg)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--staff-slate)]">{group.reqCode}</span>
                    <h3 title={group.title} className="min-w-0 truncate text-sm font-semibold text-[var(--staff-ink)] sm:text-base">{group.title}</h3>
                  </div>
                  <p title={citation} className="mt-1 hidden truncate font-mono text-[11px] text-[var(--staff-muted)] md:block">{citation}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--staff-muted)]">
                    <span className="hidden md:inline">Applies when</span>
                    <JurisdictionChips versions={group.versions} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <StatusChip status={group.status} title={group.mixedStatusTooltip ?? undefined} label={group.status === "not_enforced" ? enforcementLabel(group.versions[0].legalStatus) : undefined} />
                  {group.status !== "reviewed" ? (
                    <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                      <Link href={actionHref(group.reqCode)}>{statusButtonLabel(group.status)}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TopicRail({ groups, recent }: { groups: RuleReviewGroup[]; recent: RecentRuleReview[] }) {
  const topics = useMemo(() => {
    const map = new Map<string, { label: string; groups: RuleReviewGroup[] }>()
    for (const group of groups) {
      const item = map.get(group.topicKey) ?? { label: group.topicLabel, groups: [] }
      item.groups.push(group)
      map.set(group.topicKey, item)
    }
    return [...map.entries()].map(([key, value]) => ({ key, ...value }))
  }, [groups])

  return (
    <aside className="hidden space-y-4 lg:block">
      <section className="rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-title)] text-xl text-[var(--staff-ink)]">By topic</h2>
        <div className="mt-5 space-y-4">
          {topics.map((topic) => {
            const total = topic.groups.length
            const reviewed = topic.groups.filter((group) => group.status === "reviewed").length
            const segment = (status: RuleReviewStatus) => `${(topic.groups.filter((group) => group.status === status).length / total) * 100}%`
            return (
              <div key={topic.key}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-[var(--staff-slate)]">{topic.label}</span>
                  <span className="font-mono text-[10px] text-[var(--staff-muted)]">{reviewed}/{total}</span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--staff-slate-bg)]" aria-label={`${topic.label}: ${reviewed} of ${total} reviewed`}>
                  {(["reviewed", "stale", "needs_review", "not_enforced"] as RuleReviewStatus[]).map((status) => (
                    <span key={status} className={STATUS_META[status].bar} style={{ width: segment(status) }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-title)] text-xl text-[var(--staff-ink)]">Recently reviewed</h2>
        {recent.length ? (
          <ul className="mt-4 divide-y divide-[var(--staff-line)]">
            {recent.map((item) => (
              <li key={`${item.reqCode}-${item.reviewedOn}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="rounded bg-[var(--staff-slate-bg)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--staff-slate)]">{item.reqCode}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--staff-muted)]">{item.staffName} · {formatDate(item.reviewedOn)}</span>
                <StatusChip status="reviewed" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--staff-muted)]">No active rule has a current review yet.</p>
        )}
      </section>
    </aside>
  )
}

function Dashboard(props: RuleReviewWorkspaceProps) {
  const router = useRouter()
  const topics = [...new Map(props.groups.map((group) => [group.topicKey, group.topicLabel])).entries()]
  const selectedFilter = FILTERS.some(([key]) => key === props.filter) ? props.filter : "attention"
  const reviewedDetail = props.counts.total ? `${props.counts.activeVersions} in-force jurisdiction versions` : "No active rules"
  const nextDue = props.recent.map((item) => nextDueDate(item.reviewedOn)).sort()[0]

  if (props.counts.attention === 0 && props.counts.notEnforced === 0) {
    return (
      <main className="mx-auto max-w-[1440px] space-y-6 pb-10">
        <DashboardHeader attention={0} />
        <div className="rounded-2xl border border-[var(--staff-green)]/25 bg-[var(--staff-green-bg)] p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-[var(--staff-green)]" />
          <h2 className="mt-3 font-[family-name:var(--font-title)] text-3xl text-[var(--staff-ink)]">Every rule is reviewed and current.</h2>
          <p className="mt-2 text-sm text-[var(--staff-muted)]">Next check due {nextDue ? formatDate(nextDue) : "after the next rule review"}.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 pb-10">
      <DashboardHeader attention={props.counts.attention} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_repeat(4,minmax(0,1fr))]">
        <div className="flex min-h-44 items-center gap-5 rounded-2xl bg-[var(--staff-navy)] p-5 text-white shadow-lg md:col-span-2 xl:col-span-1">
          <ProgressRing reviewed={props.counts.reviewed} total={props.counts.total} />
          <div>
            <p className="font-[family-name:var(--font-title)] text-3xl leading-tight">{props.counts.reviewed} of {props.counts.total}</p>
            <p className="mt-1 text-sm font-semibold">rules reviewed</p>
            <p className="mt-3 max-w-sm text-xs leading-5 text-white/70">Nothing is presumed correct until our team confirms it. NYC rules shift with litigation.</p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[.12em] text-white/50">{reviewedDetail}</p>
          </div>
        </div>
        <CountCard label="Needs review" value={props.counts.needsReview} detail={`${props.counts.needsReviewVersions} jurisdiction versions`} tone="amber" />
        <CountCard label="Stale" value={props.counts.stale} detail={`${props.counts.staleVersions} jurisdiction versions past 90 days`} tone="red" />
        <CountCard label="Not enforced" value={props.counts.notEnforced} detail="Enjoined, contested or repealed" tone="slate" />
        <CountCard label="Form drift" value={props.templateWarnings.length} detail={props.templateWarnings.length ? "Official forms need attention" : "Official forms match"} tone={props.templateWarnings.length ? "red" : "green"} />
      </section>

      {props.templateWarnings.length ? (
        <section className="rounded-2xl border border-[var(--staff-red)]/25 bg-[var(--staff-red-bg)] p-5 text-[var(--staff-red)]">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-semibold">Official-form drift detected</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {props.templateWarnings.map((warning) => <li key={warning.key}><b>{warning.formNumber ?? warning.key}</b>{warning.revision ? ` (${warning.revision})` : ""} — {warning.reason}</li>)}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Rule status filter">
          {FILTERS.map(([key, label]) => (
            <Link key={key} href={filterHref(key, props.topic)} aria-current={selectedFilter === key ? "page" : undefined} className={cn("whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold", selectedFilter === key ? "border-[var(--staff-navy)] bg-[var(--staff-navy)] text-white" : "border-[var(--staff-line)] bg-[var(--staff-paper)] text-[var(--staff-slate)]")}>{label}</Link>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--staff-muted)]">
          Topic
          <select
            value={props.topic}
            onChange={(event) => router.push(filterHref(selectedFilter, event.target.value))}
            className="min-h-10 rounded-lg border border-[var(--staff-line)] bg-[var(--staff-paper)] px-3 text-sm text-[var(--staff-ink)]"
          >
            <option value="all">All topics</option>
            {topics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <RuleList groups={props.groups} filter={selectedFilter} topic={props.topic} />
        <TopicRail groups={props.groups} recent={props.recent} />
      </div>
    </main>
  )
}

function DashboardHeader({ attention }: { attention: number }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--staff-amber)]">Governance / active registry</p>
        <h1 className="mt-1 font-[family-name:var(--font-title)] text-[34px] leading-none text-[var(--staff-ink)] sm:text-[42px]">Rule review</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--staff-muted)]">Every active rule the system uses to build client checklists, and whether our team has confirmed it still matches current NY law and NYPD practice. Not for client documents — those are reviewed on each case.</p>
      </div>
      {attention ? <Button asChild className="hidden min-h-11 bg-[var(--staff-navy)] text-white hover:bg-[var(--staff-navy)]/90 md:inline-flex"><Link href="/admin/legal?mode=review">Start review · {attention}</Link></Button> : null}
    </header>
  )
}

interface Outcome {
  type: "reviewed" | "flagged"
  code: string
  jurisdictions: string[]
  reviewer?: string
  reviewedOn?: string
  nextDue?: string
}

function ReviewMode({ groups, initialRule }: { groups: RuleReviewGroup[]; initialRule: string }) {
  const router = useRouter()
  const attention = groups.filter((group) => group.status === "needs_review" || group.status === "stale")
  const selected = groups.find((group) => group.reqCode === initialRule) ?? attention[0]
  const currentIndex = attention.findIndex((group) => group.reqCode === selected?.reqCode)
  const queueIndex = currentIndex >= 0 ? currentIndex : 0
  const previous = queueIndex > 0 ? attention[queueIndex - 1] : null
  const next = attention[queueIndex + 1] ?? null
  const [checks, setChecks] = useState([false, false, false])
  const [note, setNote] = useState("")
  const [enforcement, setEnforcement] = useState<LegalStatus>(selected?.versions[0]?.legalStatus ?? "enforced")
  const [selectedIds, setSelectedIds] = useState<string[]>(selected?.versions.map((version) => version.id) ?? [])
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [flagOpen, setFlagOpen] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [reviewedCount, setReviewedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [pending, startTransition] = useTransition()

  if (!selected) {
    return <ReviewComplete reviewed={reviewedCount} skipped={skippedCount} flagged={flaggedCount} />
  }

  const versions = selected.versions.filter((version) => selectedIds.includes(version.id))
  const allChecked = checks.every(Boolean)
  const changedToNonEnforced = enforcement !== "enforced" && versions.some((version) => version.legalStatus !== enforcement)
  const canSubmit = allChecked && versions.length > 0 && (!changedToNonEnforced || note.trim().length > 0)
  const progress = attention.length ? ((queueIndex + 1) / attention.length) * 100 : 100
  const move = (group: RuleReviewGroup | null) => {
    if (!group) return
    router.push(actionHref(group.reqCode))
  }

  function submitReview() {
    if (!canSubmit) return
    startTransition(async () => {
      try {
        let firstResult: Awaited<ReturnType<typeof markRequirementVerified>> | null = null
        for (const version of versions) {
          const formData = new FormData()
          formData.set("id", version.id)
          formData.append("checks", "1")
          formData.append("checks", "2")
          formData.append("checks", "3")
          const changed = version.legalStatus !== enforcement
          let result
          if (changed || note.trim()) {
            formData.set("legal_status", enforcement)
            formData.set("legal_status_note", note)
            if (version.citation) formData.set("legal_citation", version.citation)
            result = await setRequirementLegalStatus(formData)
          } else {
            result = await markRequirementVerified(formData)
          }
          if (!firstResult) firstResult = result
        }
        if (!firstResult) return
        const jurisdictionLabels = versions.map((version) => shortJurisdiction(version.jurisdictionLabel))
        setReviewedCount((count) => count + versions.length)
        setOutcome({
          type: "reviewed",
          code: selected.reqCode,
          jurisdictions: jurisdictionLabels,
          reviewer: firstResult.reviewer,
          reviewedOn: firstResult.reviewedOn,
          nextDue: firstResult.nextDue,
        })
        toast.success(`${selected.reqCode} reviewed`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The rule was not changed.")
      }
    })
  }

  function submitFlag() {
    if (flagReason.trim().length < 3) return
    startTransition(async () => {
      try {
        for (const version of versions) {
          const formData = new FormData()
          formData.set("id", version.id)
          formData.set("reason", flagReason)
          await flagRequirementForReview(formData)
        }
        setFlagOpen(false)
        setFlaggedCount((count) => count + versions.length)
        setOutcome({ type: "flagged", code: selected.reqCode, jurisdictions: versions.map((version) => shortJurisdiction(version.jurisdictionLabel)) })
        toast.success(`${selected.reqCode} flagged for review`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The rule was not changed.")
      }
    })
  }

  if (outcome) {
    return (
      <ReviewOutcome outcome={outcome} next={next} onNext={() => move(next)} />
    )
  }

  const primary = selected.versions[0]
  const citation = primary.citation ?? primary.authority ?? "No citation recorded"
  const combinedLabel = versions.map((version) => shortJurisdiction(version.jurisdictionLabel)).join(" + ")

  return (
    <main className="mx-auto max-w-[1060px] pb-10">
      <div className="md:hidden">
        <div className="rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-5">
          <h1 className="font-[family-name:var(--font-title)] text-3xl text-[var(--staff-ink)]">Rule review</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--staff-muted)]">Reviewing is desktop-only — it needs the source open beside the rule.</p>
          <div className="mt-5 flex items-center gap-2"><span className="rounded bg-[var(--staff-slate-bg)] px-2 py-1 font-mono text-[10px]">{selected.reqCode}</span><StatusChip status={selected.status} /></div>
          <p className="mt-3 text-base font-semibold text-[var(--staff-ink)]">{selected.title}</p>
          <div className="mt-3"><JurisdictionChips versions={selected.versions} /></div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs font-semibold text-[var(--staff-slate)]">{queueIndex + 1} of {Math.max(attention.length, 1)}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--staff-slate-bg)]"><div className="h-full rounded-full bg-[var(--staff-gold)] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
          <Button asChild variant="ghost"><Link href="/admin/legal">Exit review</Link></Button>
        </div>
        <p className="mt-2 text-xs text-[var(--staff-muted)]">Needs review first, then stale · one rule at a time</p>

        <article className="mt-6 overflow-hidden rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] shadow-lg">
          <header className="border-b border-[var(--staff-line)] bg-[var(--staff-slate-bg)]/60 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[var(--staff-navy)] px-2.5 py-1 font-mono text-[10px] font-semibold text-white">{selected.reqCode}</span><StatusChip status={selected.status} title={selected.mixedStatusTooltip ?? undefined} label={selected.status === "not_enforced" ? enforcementLabel(primary.legalStatus) : undefined} /></div>
            <h1 className="mt-3 font-[family-name:var(--font-title)] text-3xl leading-tight text-[var(--staff-ink)]">{selected.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-[var(--staff-slate)]">
              <span className="rounded-full border border-[var(--staff-line)] bg-white px-2.5 py-1">{selected.topicLabel}</span>
              <span className="rounded-full border border-[var(--staff-line)] bg-white px-2.5 py-1">Applies: {selected.versions.map((version) => shortJurisdiction(version.jurisdictionLabel)).join(" + ")}</span>
              <span className="rounded-full border border-[var(--staff-line)] bg-white px-2.5 py-1">{primary.blocking ? "Blocks filing" : "Optional"}</span>
              <span className="rounded-full border border-[var(--staff-line)] bg-white px-2.5 py-1">In force since {formatDate(primary.effectiveFrom)} · v{primary.version}</span>
            </div>
          </header>

          <div className="grid gap-px bg-[var(--staff-line)] lg:grid-cols-2">
            <section className="bg-[var(--staff-paper)] p-5 sm:p-7">
              <h2 className="font-[family-name:var(--font-title)] text-2xl text-[var(--staff-ink)]">What the system requires</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--staff-muted)]">{selected.description ?? "No rule description has been recorded."}</p>

              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[.12em] text-[var(--staff-slate)]">Rule citation</h3>
              <div className="mt-2 rounded-xl bg-[var(--staff-navy)] p-4 font-mono text-xs leading-5 text-white">{citation}</div>

              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[.12em] text-[var(--staff-slate)]">Source</h3>
              <div className="mt-2 space-y-2 text-sm">
                {selected.versions.map((version) => (
                  <div key={version.id} className="rounded-xl border border-[var(--staff-line)] p-3">
                    <div className="flex items-center justify-between gap-3"><b className="text-[var(--staff-ink)]">{shortJurisdiction(version.jurisdictionLabel)}</b><StatusChip status={version.status} /></div>
                    {version.sourceUrl ? <a href={version.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--staff-navy)] underline underline-offset-2">Open source <ExternalLink className="size-3" /></a> : <p className="mt-2 text-xs text-[var(--staff-muted)]">No source URL recorded.</p>}
                    <p className="mt-2 font-mono text-[11px] leading-5 text-[var(--staff-muted)]">{version.citation ?? version.authority ?? "No citation recorded"}</p>
                    {version.changedSummary ? <p className="mt-2 text-xs leading-5 text-[var(--staff-slate)]"><b>Changed from last version:</b> {version.changedSummary}</p> : null}
                  </div>
                ))}
              </div>
              {selected.versions.length > 1 ? <p className="mt-4 rounded-xl bg-[var(--staff-amber-bg)] p-3 text-xs leading-5 text-[var(--staff-amber)]">Same rule in <b>NYC</b> and <b>Special / Non-Resident</b> — review each separately or both.</p> : null}
            </section>

            <section className="bg-[var(--staff-paper)] p-5 sm:p-7">
              <h2 className="font-[family-name:var(--font-title)] text-2xl text-[var(--staff-ink)]">Before you mark it reviewed</h2>
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Required review checks</legend>
                {[
                  "I read the cited sections and the source.",
                  "The requirement text matches what the law and NYPD ask for today.",
                  "I checked for injunctions or litigation affecting it.",
                ].map((label, index) => (
                  <label key={label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--staff-line)] p-3 text-sm leading-5 text-[var(--staff-slate)] has-[:checked]:border-[var(--staff-green)]/40 has-[:checked]:bg-[var(--staff-green-bg)]">
                    <input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} className="mt-0.5 size-4 accent-[var(--staff-navy)]" />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="mt-6 block text-sm font-semibold text-[var(--staff-ink)]">Note <span className="font-normal text-[var(--staff-muted)]">(optional)</span><Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="What you checked and any caveats." className="mt-2 font-normal" /></label>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-[var(--staff-ink)]">Enforcement</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ENFORCEMENT_OPTIONS.map((option) => (
                    <label key={option.value} className={cn("cursor-pointer rounded-lg border px-3 py-2 text-center text-xs font-semibold", enforcement === option.value ? "border-[var(--staff-navy)] bg-[var(--staff-navy)] text-white" : "border-[var(--staff-line)] text-[var(--staff-slate)]")}>
                      <input type="radio" name="enforcement" value={option.value} checked={enforcement === option.value} onChange={() => setEnforcement(option.value)} className="sr-only" />{option.label}
                    </label>
                  ))}
                </div>
                {changedToNonEnforced ? <p className="mt-2 text-xs text-[var(--staff-red)]">A note is required when changing a rule to a status other than Enforced.</p> : null}
              </fieldset>
            </section>
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--staff-line)] bg-[var(--staff-slate-bg)]/60 p-4 sm:p-5">
            <Button variant="ghost" disabled={!previous || pending} onClick={() => move(previous)}>Previous</Button>
            <Button variant="outline" disabled={pending} onClick={() => setFlagOpen(true)}><Flag className="size-4" />Flag a problem…</Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setSkippedCount((count) => count + versions.length)
                if (next) move(next)
                else router.push("/admin/legal")
              }}
            >
              Skip
            </Button>
            <div className="ml-auto flex">
              <Button
                disabled={!canSubmit || pending}
                aria-describedby={!allChecked ? "review-checks-help" : undefined}
                onClick={submitReview}
                className="rounded-r-none bg-[var(--staff-navy)] text-white hover:bg-[var(--staff-navy)]/90"
              >
                {pending ? "Saving review…" : `Mark reviewed: ${combinedLabel}`}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button aria-label="Choose jurisdictions" disabled={pending} className="rounded-l-none border-l border-white/20 bg-[var(--staff-navy)] px-2 text-white hover:bg-[var(--staff-navy)]/90"><ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56 bg-[var(--staff-paper)] text-[var(--staff-ink)]">
                  {selected.versions.map((version) => <DropdownMenuItem key={version.id} onSelect={() => { setSelectedIds([version.id]); setEnforcement(version.legalStatus) }}>Review {shortJurisdiction(version.jurisdictionLabel)} only</DropdownMenuItem>)}
                  {selected.versions.length > 1 ? <DropdownMenuItem onSelect={() => { setSelectedIds(selected.versions.map((version) => version.id)); setEnforcement(selected.versions[0].legalStatus) }}>Review both jurisdictions</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p id="review-checks-help" className="basis-full text-right text-[11px] text-[var(--staff-muted)]">Tick all three checks to continue.</p>
          </footer>
        </article>
      </div>

      <div aria-live="polite" className="sr-only">{pending ? "Saving review" : ""}</div>

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="bg-[var(--staff-paper)] text-[var(--staff-ink)] sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-[family-name:var(--font-title)] text-2xl">Flag {selected.reqCode} for review?</DialogTitle><DialogDescription>Marks it as needing review again. Existing cases keep their checklist.</DialogDescription></DialogHeader>
          <div className="px-4 pb-2 sm:px-6"><label className="text-sm font-semibold">What&apos;s wrong <Textarea required value={flagReason} onChange={(event) => setFlagReason(event.target.value)} rows={4} className="mt-2 font-normal" placeholder="Describe the mismatch, new source or litigation concern." /></label></div>
          <DialogFooter><Button variant="ghost" onClick={() => setFlagOpen(false)} disabled={pending}>Cancel</Button><Button onClick={submitFlag} disabled={flagReason.trim().length < 3 || pending} className="bg-[var(--staff-red)] text-white hover:bg-[var(--staff-red)]/90">{pending ? "Flagging…" : "Flag for review"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ReviewOutcome({ outcome, next, onNext }: { outcome: Outcome; next: RuleReviewGroup | null; onNext: () => void }) {
  const reviewed = outcome.type === "reviewed"
  return (
    <main className="mx-auto grid min-h-[62svh] max-w-[760px] place-items-center pb-10">
      <section aria-live="polite" className="w-full rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-7 text-center shadow-lg sm:p-10">
        <span className={cn("mx-auto grid size-14 place-items-center rounded-full", reviewed ? "bg-[var(--staff-green-bg)] text-[var(--staff-green)]" : "bg-[var(--staff-amber-bg)] text-[var(--staff-amber)]")}>{reviewed ? <ShieldCheck className="size-7" /> : <Flag className="size-6" />}</span>
        <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[.14em] text-[var(--staff-muted)]">{outcome.code} · {outcome.jurisdictions.join(" + ")}</p>
        <h1 className="mt-2 font-[family-name:var(--font-title)] text-4xl text-[var(--staff-ink)]">{reviewed ? "Reviewed" : "Flagged for review"}</h1>
        {reviewed ? <p className="mt-4 text-sm leading-6 text-[var(--staff-muted)]">Reviewed by {outcome.reviewer} · {formatDate(outcome.reviewedOn!)}.<br />Next check due {formatDate(outcome.nextDue!)}.</p> : <p className="mt-4 text-sm leading-6 text-[var(--staff-muted)]">The reason is preserved in the rule record and activity log. Existing cases keep their checklist.</p>}
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"><Button asChild variant="outline"><Link href="/admin/legal">Back to list</Link></Button>{next ? <Button onClick={onNext} className="bg-[var(--staff-navy)] text-white hover:bg-[var(--staff-navy)]/90">Next rule</Button> : null}</div>
      </section>
    </main>
  )
}

function ReviewComplete({ reviewed, skipped, flagged }: { reviewed: number; skipped: number; flagged: number }) {
  return (
    <main className="mx-auto grid min-h-[62svh] max-w-[760px] place-items-center pb-10">
      <section className="w-full rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-8 text-center shadow-lg">
        <CheckCircle2 className="mx-auto size-12 text-[var(--staff-green)]" />
        <h1 className="mt-4 font-[family-name:var(--font-title)] text-4xl text-[var(--staff-ink)]">All caught up</h1>
        <p className="mt-3 text-sm text-[var(--staff-muted)]">{reviewed} reviewed, {skipped} skipped, {flagged} flagged.</p>
        <Button asChild className="mt-6 bg-[var(--staff-navy)] text-white hover:bg-[var(--staff-navy)]/90"><Link href="/admin/legal">Back to Rule review</Link></Button>
      </section>
    </main>
  )
}

export function RuleReviewWorkspace(props: RuleReviewWorkspaceProps) {
  return props.mode === "review" ? <ReviewMode key={props.rule || "review-queue"} groups={props.groups} initialRule={props.rule} /> : <Dashboard {...props} />
}

export function RuleReviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Rule review" className="mx-auto max-w-[1440px] space-y-6 animate-pulse pb-10 motion-reduce:animate-none">
      <div className="h-24 rounded-2xl bg-[var(--staff-slate-bg)]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="h-44 rounded-2xl bg-[var(--staff-navy)]/20 md:col-span-2 xl:col-span-1" />{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 rounded-2xl bg-[var(--staff-slate-bg)]" />)}</div>
      <div className="h-[520px] rounded-2xl bg-[var(--staff-slate-bg)]" />
    </div>
  )
}

export function RuleReviewPermissionNotice() {
  return (
    <main className="mx-auto grid min-h-[58svh] max-w-xl place-items-center text-center">
      <div className="rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-8 shadow-sm"><AlertTriangle className="mx-auto size-9 text-[var(--staff-amber)]" /><h1 className="mt-4 font-[family-name:var(--font-title)] text-3xl text-[var(--staff-ink)]">Rule review is for admins.</h1><p className="mt-3 text-sm leading-6 text-[var(--staff-muted)]">Staff can see each rule&apos;s status on Requirements.</p><Button asChild variant="outline" className="mt-6"><Link href="/admin/requirements">Open Requirements</Link></Button></div>
    </main>
  )
}
