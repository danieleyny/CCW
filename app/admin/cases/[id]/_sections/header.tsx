"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  Ellipsis,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { previewStageChange, setCaseStage, setCaseStatus, type StagePreviewResult } from "@/app/admin/actions"
import { AssignControl, AssignTrainerControl } from "@/components/admin/assign-control"
import { InviteClientButton } from "@/components/admin/invite-client-button"
import { RecordLicenseControl } from "@/components/admin/record-license-control"
import { AdminStartRenewal } from "@/components/admin/start-renewal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CASE_STAGES, isNypdControlled, stageIndex, stageMeta, type CaseStageKey } from "@/config/stages"
import { trackEvent } from "@/lib/analytics"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type CaseWorkspaceTab =
  | "overview"
  | "checklist"
  | "documents"
  | "people"
  | "disclosures"
  | "training"
  | "messages"
  | "notes"
  | "application"
  | "intake"
  | "activity"

interface HeaderProps {
  caseId: string
  clientId: string
  clientName: string
  email: string | null
  phone: string | null
  borough: string | null
  serviceLabel: string
  trackLabel: string
  applicationLabel: string | null
  openedAt: string
  nypdRef: string | null
  ownerName: string | null
  trainerName: string | null
  assignedStaff: string | null
  assignedTrainer: string | null
  staff: Array<{ id: string; name: string }>
  instructors: Array<{ id: string; name: string; verified: boolean }>
  stage: CaseStageKey
  status: string
  daysInStage: number
  stalled: boolean
  whoseMove: string
  isLead: boolean
  leadGroup: string | null
  isRenewal: boolean
  isDemo: boolean
  hasInvite: boolean
  canRecordLicense: boolean
  canStartRenewal: boolean
  currentTab: CaseWorkspaceTab
  counts: { blocking: number; documents: number; people: number; messages: number; tasks: number }
  licenseType: string | null
  licenseIssued: boolean
  isSpecialCarry: boolean
}

const TAB_LINKS: Array<{ key: CaseWorkspaceTab; label: string; count?: keyof HeaderProps["counts"]; tone?: "gold" | "red" }> = [
  { key: "overview", label: "Overview" },
  { key: "checklist", label: "Checklist", count: "blocking", tone: "gold" },
  { key: "documents", label: "Documents", count: "documents" },
  { key: "people", label: "People", count: "people" },
  { key: "disclosures", label: "Disclosures" },
  { key: "training", label: "Training" },
  { key: "messages", label: "Messages", count: "messages", tone: "red" },
  { key: "notes", label: "Notes & tasks", count: "tasks" },
  { key: "application", label: "Application" },
]

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  blocked: "Blocked",
  on_hold: "On hold",
  closed: "Closed",
  approved: "Approved",
  denied: "Denied",
}

function copy(value: string, label: string) {
  void navigator.clipboard.writeText(value)
  toast.success(`${label} copied`)
}

export function CaseHeader(props: HeaderProps) {
  const stage = stageMeta(props.stage)
  const stageNumber = stage.order
  const visibleStatus = props.status !== "active"

  useEffect(() => {
    trackEvent("admin_case_tab_viewed", { tab: props.currentTab })
  }, [props.currentTab])

  return (
    <>
      <Link href="/admin/cases" className="mb-3 inline-flex items-center gap-1 text-sm text-text-mid hover:text-foreground">
        <ArrowLeft className="size-4" /> All cases
      </Link>
      <header className="relative z-20 mb-5 overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm md:sticky md:top-2">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 gap-3.5">
              <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-signal text-sm font-semibold text-primary-foreground shadow-sm">
                {props.clientName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <h1 className="line-clamp-2 font-display text-2xl leading-tight text-foreground sm:text-[30px]">{props.clientName}</h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone={props.serviceLabel === "Concierge" ? "gold" : "muted"}>{props.serviceLabel === "Concierge" ? "Full Concierge" : props.serviceLabel}</Chip>
                  <Chip>{props.trackLabel}</Chip>
                  {props.applicationLabel && <Chip>{props.applicationLabel}</Chip>}
                  {props.isRenewal && <Chip tone="gold">Renewal</Chip>}
                  {props.isDemo && <Chip tone="warn">Demo</Chip>}
                  {props.stalled && <Chip tone="danger">Stalled · {props.daysInStage} days</Chip>}
                  {visibleStatus && <Chip tone={props.status === "approved" ? "ok" : "danger"}>{STATUS_LABELS[props.status] ?? props.status}</Chip>}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-text-mid">
                  {props.email && (
                    <button type="button" onClick={() => copy(props.email!, "Email")} className="inline-flex min-h-8 items-center gap-1 hover:text-foreground" title="Copy email">
                      <Mail className="size-3.5" /> {props.email} <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  )}
                  {props.phone && (
                    <button type="button" onClick={() => copy(props.phone!, "Phone number")} className="inline-flex min-h-8 items-center gap-1 hover:text-foreground" title="Copy phone number">
                      <Phone className="size-3.5" /> {props.phone}
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1">
                    Owner {props.ownerName ?? "Unassigned"}
                    <Popover>
                      <PopoverTrigger asChild><button type="button" className="font-medium text-signal underline-offset-2 hover:underline">Change</button></PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-3">
                        <p className="mb-2 text-xs font-medium text-text-mid">Assign consultant</p>
                        <AssignControl caseId={props.caseId} clientId={props.clientId} current={props.assignedStaff} staff={props.staff} />
                        <p className="mt-2 text-[11px] text-text-low">The assignment saves when selected.</p>
                      </PopoverContent>
                    </Popover>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Trainer {props.trainerName ?? "Unassigned"}
                    <Popover>
                      <PopoverTrigger asChild><button type="button" className="font-medium text-signal underline-offset-2 hover:underline">Change</button></PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-3">
                        <p className="mb-2 text-xs font-medium text-text-mid">Assign trainer</p>
                        <AssignTrainerControl caseId={props.caseId} current={props.assignedTrainer} instructors={props.instructors} />
                        <p className="mt-2 text-[11px] text-text-low">The assignment saves when selected.</p>
                      </PopoverContent>
                    </Popover>
                  </span>
                  <span>Opened {formatDate(props.openedAt)}</span>
                  {props.nypdRef && <span className="font-mono">NYPD {props.nypdRef}</span>}
                  {props.borough && <span>{props.borough}</span>}
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex xl:justify-end">
              <DownloadsMenu caseId={props.caseId} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More case actions"><Ellipsis /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel>Case actions</DropdownMenuLabel>
                  {props.hasInvite && <DropdownMenuItem asChild><div><InviteClientButton caseId={props.caseId} /></div></DropdownMenuItem>}
                  {props.canRecordLicense && (
                    <DropdownMenuItem asChild>
                      <div><RecordLicenseControl caseId={props.caseId} isSpecialCarry={props.isSpecialCarry} defaultLicenseType={props.licenseType} issued={props.licenseIssued} /></div>
                    </DropdownMenuItem>
                  )}
                  {props.canStartRenewal && <DropdownMenuItem asChild><div><AdminStartRenewal caseId={props.caseId} /></div></DropdownMenuItem>}
                  {!props.hasInvite && !props.canRecordLicense && !props.canStartRenewal && <DropdownMenuItem disabled>No additional actions</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
              <StageChangeDialog caseId={props.caseId} clientName={props.clientName} stage={props.stage} status={props.status} />
            </div>
          </div>

          <div className="mt-4 border-t border-hairline pt-3">
            {props.isLead ? (
              <p className="text-sm font-medium">Lead · not paid yet{props.leadGroup ? ` · ${props.leadGroup}` : ""}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p>Stage <b>{stageNumber} · {stage.short}</b> — {phaseFor(props.stage)} phase</p>
                  <p className={cn("text-xs", props.stalled ? "font-semibold text-danger" : "text-text-mid")}>
                    {props.stalled && "⚠ "}{props.daysInStage} days in stage{props.stalled ? ` · ${props.whoseMove}'s move` : ""}
                  </p>
                </div>
                <StageTrack stage={props.stage} />
              </>
            )}
          </div>
        </div>

        <CaseTabs caseId={props.caseId} current={props.currentTab} counts={props.counts} />
      </header>

      <div className="fixed inset-x-3 bottom-[76px] z-30 flex gap-2 rounded-xl border border-hairline bg-card/95 p-2 shadow-lg backdrop-blur-sm md:hidden">
        <Button asChild variant="outline" className="flex-1"><Link href={`/admin/cases/${props.caseId}?tab=messages`}><MessageSquare /> Message</Link></Button>
        <DownloadsMenu caseId={props.caseId} compact />
        <StageChangeDialog caseId={props.caseId} clientName={props.clientName} stage={props.stage} status={props.status} compact />
      </div>
    </>
  )
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "warn" | "danger" | "ok" }) {
  const tones = {
    muted: "border-hairline bg-surface-2 text-text-mid",
    gold: "border-brass/30 bg-brass/10 text-brass-bright",
    warn: "border-warn/30 bg-warn/10 text-warn",
    danger: "border-danger/30 bg-danger/10 text-danger",
    ok: "border-ok/30 bg-ok/10 text-ok",
  }
  return <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em]", tones[tone])}>{children}</span>
}

function phaseFor(stage: CaseStageKey) {
  if (["lead", "eligibility_screened", "signed_up_paid"].includes(stage)) return "Getting started"
  if (["training_scheduled", "training_complete"].includes(stage)) return "Training"
  if (["document_collection", "notarization"].includes(stage)) return "Paperwork"
  if (["application_assembled", "filed"].includes(stage)) return "Filing"
  if (["fingerprinting_booked", "under_investigation", "decision"].includes(stage)) return "With NYPD"
  return "Licensed"
}

function StageTrack({ stage }: { stage: CaseStageKey }) {
  const current = Math.max(0, stageIndex(stage) - 2)
  const steps = CASE_STAGES.slice(2)
  return (
    <div className="mt-3" role="img" aria-label={`Stage ${stageMeta(stage).order} of 13: ${stageMeta(stage).label}`}>
      <div className="grid grid-cols-11 items-end gap-1">
        {steps.map((item, index) => {
          const done = index < current
          const active = index === current
          const nypd = isNypdControlled(item.key)
          return <span key={item.key} className={cn("h-1.5 rounded-full", done ? "bg-primary" : nypd ? "bg-slate-300" : "bg-surface-3", active && "h-2.5 bg-brass")} />
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-4 text-[9px] uppercase tracking-[.11em] text-text-low">
        <span>Start</span><span>Paperwork</span><span className="text-center">NYPD</span><span className="text-right">Licensed</span>
      </div>
    </div>
  )
}

function CaseTabs({ caseId, current, counts }: { caseId: string; current: CaseWorkspaceTab; counts: HeaderProps["counts"] }) {
  return (
    <nav role="tablist" aria-label="Case workspace" className="relative flex max-w-full gap-1 overflow-x-auto border-t border-hairline px-3 [scrollbar-width:none] sm:px-5">
      {TAB_LINKS.map((tab) => {
        const count = tab.count ? counts[tab.count] : 0
        return (
          <Link
            key={tab.key}
            href={`/admin/cases/${caseId}?tab=${tab.key}`}
            role="tab"
            aria-selected={current === tab.key}
            className={cn("relative flex min-h-12 shrink-0 items-center gap-1.5 px-2 text-xs font-medium text-text-mid hover:text-foreground", current === tab.key && "text-foreground after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-brass")}
          >
            {tab.label}
            {count > 0 && <span className={cn("rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px]", tab.tone === "gold" && "bg-brass/15 text-brass-bright", tab.tone === "red" && "bg-danger/10 text-danger")}>{count}</span>}
          </Link>
        )
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" role="tab" aria-selected={current === "intake" || current === "activity"} className={cn("flex min-h-12 shrink-0 items-center gap-1 px-2 text-xs font-medium text-text-mid", (current === "intake" || current === "activity") && "text-foreground")}>More <ChevronDown className="size-3" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/admin/cases/${caseId}?tab=intake`}>Intake responses</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href={`/admin/cases/${caseId}?tab=activity`}>Activity</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

function DownloadsMenu({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  const items = [
    ["Portal worksheet", "worksheet"], ["Filing pack", "filing-pack"], ["Documents only", "packet"],
    ["Application record", "application-record"], ["Upload set", "upload-set"],
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={compact ? "flex-1" : undefined}><Download /> {compact ? "Downloads" : "Downloads"}<ChevronDown className="size-3" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Open in a new tab</DropdownMenuLabel><DropdownMenuSeparator />
        {items.map(([label, path]) => <DropdownMenuItem key={path} asChild><a href={`/admin/cases/${caseId}/${path}`} target="_blank" rel="noreferrer"><Download /> {label}</a></DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StageChangeDialog({ caseId, clientName, stage, status, compact = false }: { caseId: string; clientName: string; stage: CaseStageKey; status: string; compact?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<CaseStageKey | "">("")
  const [reason, setReason] = useState("")
  const [preview, setPreview] = useState<StagePreviewResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusTarget, setStatusTarget] = useState("")
  const [confirmName, setConfirmName] = useState("")
  const [pending, start] = useTransition()
  const targetMeta = target ? stageMeta(target) : null
  const movingBack = !!target && stageIndex(target) < stageIndex(stage)
  const stageReasonRequired = !!target && (movingBack || isNypdControlled(target))
  const terminalStatus = ["closed", "approved", "denied"].includes(statusTarget)
  const firstName = clientName.trim().split(/\s+/)[0] ?? ""

  function selectTarget(nextTarget: CaseStageKey) {
    setTarget(nextTarget)
    setStatusTarget("")
    setReason("")
    setError(null)
    let alive = true
    setPreviewing(true)
    previewStageChange(caseId, nextTarget)
      .then((result) => {
        if (!alive) return
        setPreview(result)
        if (!result.ok) trackEvent("admin_stage_change_blocked", { target: nextTarget, blocker_count: result.blockers.length })
      })
      .catch(() => alive && setError("The gate preview couldn't load. No change has been made."))
      .finally(() => alive && setPreviewing(false))
    return () => { alive = false }
  }

  const stageDisabled = !target || previewing || preview?.ok === false || (stageReasonRequired && !reason.trim())
  const statusDisabled = !statusTarget || !reason.trim() || (terminalStatus && confirmName.trim().toLowerCase() !== firstName.toLowerCase())

  function submitStage() {
    if (!target || stageDisabled) return
    setError(null)
    start(async () => {
      try {
        const result = await setCaseStage(caseId, target, reason)
        if (!result.ok) {
          setPreview({ gated: true, ok: false, blockers: result.blockers, signedOffAt: null, signedOffBy: null })
          setError("The pre-filing gate doesn't pass yet.")
          trackEvent("admin_stage_change_blocked", { target, blocker_count: result.blockers.length })
          return
        }
        toast.success(`Stage changed to ${stageMeta(target).label}`)
        setOpen(false)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error && caught.message.includes("reason") ? caught.message : "You don't have permission to make this change, or the request failed.")
      }
    })
  }

  function submitStatus() {
    if (statusDisabled) return
    setError(null)
    start(async () => {
      try {
        await setCaseStatus(caseId, statusTarget, reason)
        toast.success(`Status changed to ${STATUS_LABELS[statusTarget]}`)
        setOpen(false)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error && caught.message.includes("reason") ? caught.message : "You don't have permission to make this change, or the request failed.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (pending) return; setOpen(next); if (next) trackEvent("admin_stage_dialog_opened") }}>
      <DialogTrigger asChild><Button className={compact ? "flex-1" : undefined}><ClipboardList /> {compact ? "Stage" : "Change stage…"}</Button></DialogTrigger>
      <DialogContent
        manualPosition
        className="inset-x-0 bottom-0 max-h-[92dvh] max-w-none overflow-y-auto rounded-b-none p-5 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[520px] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Change stage</DialogTitle>
          <DialogDescription>{clientName} · now in {stageMeta(stage).order}. {stageMeta(stage).label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-mid">Move to</label>
            <Select value={target} onValueChange={(value) => selectTarget(value as CaseStageKey)}>
              <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
              <SelectContent>
                {CASE_STAGES.map((item) => (
                  <SelectItem key={item.key} value={item.key} disabled={item.key === stage}>
                    {item.order}. {item.label}{stageIndex(item.key) < stageIndex(stage) ? " (back)" : ""}{isNypdControlled(item.key) ? " · NYPD milestone" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target && (
            <div role="alert" className={cn("rounded-lg border p-3 text-xs", previewing ? "border-hairline bg-surface-2" : preview?.ok ? "border-ok/30 bg-ok/8 text-ok" : "border-danger/30 bg-danger/8 text-danger")}>
              {previewing ? "Checking the pre-filing gate…" : preview?.gated ? preview.ok ? (
                <p className="flex items-center gap-1.5 font-medium"><CheckCircle2 className="size-4" /> Pre-filing gate passes{preview.signedOffBy ? ` · signed off by ${preview.signedOffBy}` : ""}{preview.signedOffAt ? ` ${formatDate(preview.signedOffAt)}` : ""}</p>
              ) : (
                <><p className="flex items-center gap-1.5 font-semibold"><ShieldAlert className="size-4" /> The pre-filing gate doesn&apos;t pass yet</p><ul className="mt-2 list-disc space-y-1 pl-5">{preview?.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>
              ) : <p className="flex items-center gap-1.5"><CheckCircle2 className="size-4" /> No gate on this step</p>}
            </div>
          )}

          {targetMeta && <p className="rounded-lg border border-hairline bg-surface-2 p-3 text-xs text-text-mid">The client&apos;s portal will show “{targetMeta.clientHint}” after you confirm.</p>}

          {target && (
            <div>
              <label htmlFor="stage-reason" className="mb-1.5 block text-xs font-semibold text-text-mid">Reason {stageReasonRequired ? "(required)" : "(optional)"}</label>
              <Textarea id="stage-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add context for the activity log…" />
            </div>
          )}

          <details className="rounded-lg border border-hairline p-3" onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) setTarget("") }}>
            <summary className="cursor-pointer text-sm font-semibold">Change status instead</summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <label key={key} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm", statusTarget === key && "border-brass bg-brass/8", status === key && "opacity-50")}>
                  <input type="radio" name="case-status" value={key} checked={statusTarget === key} disabled={status === key} onChange={() => { setStatusTarget(key); setReason(""); setConfirmName(""); setError(null) }} /> {label}
                </label>
              ))}
            </div>
            {statusTarget && (
              <div className="mt-3 space-y-3">
                <div><label htmlFor="status-reason" className="mb-1 block text-xs font-semibold">Reason (required)</label><Textarea id="status-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div>
                {terminalStatus && <div><label htmlFor="confirm-name" className="mb-1 block text-xs font-semibold">Type {firstName} to confirm</label><input id="confirm-name" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></div>}
              </div>
            )}
          </details>

          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/8 p-3 text-xs text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          {statusTarget ? <Button onClick={submitStatus} disabled={pending || statusDisabled}>{pending ? "Saving…" : `${STATUS_LABELS[statusTarget]} case`}</Button> : <Button onClick={submitStage} disabled={pending || stageDisabled}>{pending ? "Saving…" : targetMeta ? `Move to ${targetMeta.short}` : "Choose a stage"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
