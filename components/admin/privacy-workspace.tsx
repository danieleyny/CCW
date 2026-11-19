"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Ban,
  Check,
  CheckCircle2,
  Database,
  Eye,
  FilePenLine,
  LockKeyhole,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  acknowledgeDataRequest,
  executeErasure,
  previewDataErasure,
  resolveDataRequest,
} from "@/app/admin/privacy/actions"
import type { AdminPrivacyData, PrivacyRequestView } from "@/lib/admin/privacy"
import { privacySteps, type PrivacyKind } from "@/lib/admin/privacy-model"
import {
  ERASURE_DELETE_TABLES,
  ERASURE_SURFACE_LABELS,
  type ErasurePreview,
} from "@/lib/privacy/erase"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type PrivacyTab = "retention" | "erasure" | "closed"
type DialogState = { kind: "done" | "refuse" | "erase"; request: PrivacyRequestView } | null

const KIND_META = {
  access: { label: "Access", icon: Eye, cls: "border-[#A9C8F5] bg-[#EDF5FF] text-[#245FA8]" },
  correction: { label: "Correction", icon: FilePenLine, cls: "border-[#E7C66F] bg-[#FFF8E6] text-[#8A5D08]" },
  deletion: { label: "Deletion", icon: Trash2, cls: "border-[#F0B8B4] bg-[#FFF1F0] text-[#B42318]" },
} as const

function pageHref(params: { request?: string | null; tab?: PrivacyTab; review?: boolean }) {
  const search = new URLSearchParams()
  if (params.request) search.set("r", params.request)
  if (params.tab && params.tab !== "retention") search.set("tab", params.tab)
  if (params.review) search.set("review", "1")
  return `/admin/privacy${search.size ? `?${search.toString()}` : ""}`
}

function KindChip({ kind }: { kind: PrivacyKind }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.cls)}><Icon className="size-3.5" aria-hidden />{meta.label}</span>
}

function Progress({ status }: { status: PrivacyRequestView["status"] }) {
  const step = status === "open" ? 1 : status === "acknowledged" ? 2 : 3
  return <div className="flex items-center gap-1.5" aria-label={`${status === "open" ? "Received" : status === "acknowledged" ? "Acknowledged" : "Done"}, step ${step} of 3`}>
    {[1, 2, 3].map((value) => <span key={value} className={cn("size-2 rounded-full", value <= step ? value === step && step < 3 ? "bg-[#D9B25F]" : "bg-[#21845A]" : "bg-[#D0D5DD]")} />)}
    <span className="ml-1 text-xs capitalize text-[#667085]">{status === "fulfilled" ? "done" : status}</span>
  </div>
}

function Waiting({ request, compact = false }: { request: PrivacyRequestView; compact?: boolean }) {
  const { timing } = request
  const width = Math.min(100, Math.max(4, Math.round((timing.days / 30) * 100)))
  const color = timing.tone === "red" ? "#B42318" : timing.tone === "amber" ? "#B7791F" : "#14254A"
  return <div className={cn("min-w-0", compact ? "w-full" : "w-[180px]")}>
    <p className={cn("text-xs font-medium", timing.late ? "text-[#B42318]" : "text-[#475467]")}>{timing.label}</p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAECF0]" aria-hidden><div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} /></div>
  </div>
}

function RequestSteps({ request }: { request: PrivacyRequestView }) {
  return <ol className="space-y-3">
    {privacySteps(request.kind, request.status).map((step) => <li key={step.number} className="grid grid-cols-[26px_1fr] gap-3 text-sm">
      <span className={cn("grid size-6 place-items-center rounded-full border text-[11px] font-semibold", step.complete ? "border-[#21845A] bg-[#E8F5EE] text-[#21845A]" : step.current ? "border-[#D9B25F] bg-[#FBF4E4] text-[#8A5D08]" : "border-[#D0D5DD] text-[#98A2B3]")}>{step.complete ? <Check className="size-3.5" aria-hidden /> : step.number}</span>
      <span className={cn("leading-6", step.complete ? "text-[#475467]" : step.current ? "font-semibold text-[#101828]" : "text-[#98A2B3]")}>{step.label}</span>
    </li>)}
  </ol>
}

function RequestActions({ request, isAdmin, pending, onAcknowledge, onDialog, onReview }: {
  request: PrivacyRequestView
  isAdmin: boolean
  pending: boolean
  onAcknowledge: (request: PrivacyRequestView) => void
  onDialog: (state: DialogState) => void
  onReview: (request: PrivacyRequestView) => void
}) {
  return <div className="flex flex-wrap gap-2">
    {request.status === "open" ? <Button type="button" disabled={pending} onClick={() => onAcknowledge(request)} className="bg-[#14254A] text-white hover:bg-[#203862]"><Eye className="size-4" aria-hidden />Acknowledge</Button> : null}
    {request.status === "acknowledged" && request.kind !== "deletion" ? <Button type="button" disabled={pending} onClick={() => onDialog({ kind: "done", request })} className="bg-[#14254A] text-white hover:bg-[#203862]"><Check className="size-4" aria-hidden />Mark done…</Button> : null}
    {request.kind === "deletion" && request.status === "acknowledged" && isAdmin ? <Button type="button" disabled={pending} onClick={() => onReview(request)} variant="outline" className="hidden border-[#E6AAA5] text-[#B42318] md:inline-flex"><Trash2 className="size-4" aria-hidden />Review erasure…</Button> : null}
    <Button type="button" disabled={pending} variant="ghost" onClick={() => onDialog({ kind: "refuse", request })} className="text-[#475467]"><Ban className="size-4" aria-hidden />Refuse…</Button>
  </div>
}

function DetailPanel({ request, isAdmin, pending, onAcknowledge, onDialog, onReview }: {
  request: PrivacyRequestView
  isAdmin: boolean
  pending: boolean
  onAcknowledge: (request: PrivacyRequestView) => void
  onDialog: (state: DialogState) => void
  onReview: (request: PrivacyRequestView) => void
}) {
  return <div className="space-y-5 p-5">
    <KindChip kind={request.kind} />
    <div><h2 className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">{request.clientName}</h2><p className="mt-1 text-xs text-[#667085]">{request.caseLine}</p><p className="mt-1 break-words text-xs text-[#667085]">{request.requesterEmail} · received {formatDate(request.requestedAt)}</p></div>
    <Progress status={request.status} />
    {request.detail ? <blockquote className="rounded-r-xl border-l-[3px] border-[#D9B25F] bg-[#F8F6F0] px-4 py-3 text-sm leading-6 text-[#344054]">“{request.detail}”</blockquote> : <p className="rounded-lg bg-[#F6F7F9] p-3 text-sm text-[#667085]">No additional request text.</p>}
    <div><h3 className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-[#667085]">Steps</h3><RequestSteps request={request} /></div>
    {!isAdmin && request.kind === "deletion" ? <p className="rounded-lg bg-[#EEF1F4] p-3 text-xs text-[#475467]"><LockKeyhole className="mr-1 inline size-3.5" aria-hidden />Only admins can erase data or change retention.</p> : null}
    <RequestActions request={request} isAdmin={isAdmin} pending={pending} onAcknowledge={onAcknowledge} onDialog={onDialog} onReview={onReview} />
    {request.caseId ? <div className="border-t border-black/[.08] pt-4 text-right"><Link href={`/admin/cases/${request.caseId}`} className="text-sm font-semibold text-[#14254A] underline underline-offset-4">Open case</Link></div> : null}
  </div>
}

function RequestTable({ data, selectedId, tab }: { data: AdminPrivacyData; selectedId: string | null; tab: PrivacyTab }) {
  return <div className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm">
    {data.open.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-[#F7F5EF] font-mono text-[10px] uppercase tracking-[.11em] text-[#667085]"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Waiting · 30-day target</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3 text-right"><span className="sr-only">Open</span></th></tr></thead><tbody>{data.open.map((request) => <tr key={request.id} className={cn("border-t border-black/[.07]", selectedId === request.id && "bg-[#F8FAFD] shadow-[inset_3px_0_0_#14254A]")}><td className="px-4 py-4"><KindChip kind={request.kind} /></td><td className="max-w-[250px] px-4 py-4"><Link href={request.caseId ? `/admin/cases/${request.caseId}` : pageHref({ request: request.id, tab })} className="block truncate text-sm font-semibold text-[#101828] hover:underline">{request.clientName}</Link><span className="mt-1 block truncate text-xs text-[#667085]">{request.caseLine}</span></td><td className="px-4 py-4"><Waiting request={request} /></td><td className="px-4 py-4"><Progress status={request.status} /></td><td className="px-4 py-4 text-right"><Button asChild variant="outline" size="sm"><Link href={pageHref({ request: request.id, tab })}>Open</Link></Button></td></tr>)}</tbody></table></div> : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#E8F5EE] text-[#16734A]"><CheckCircle2 className="size-6" aria-hidden /></span><h2 className="mt-3 font-[family-name:var(--font-title)] text-2xl font-semibold">No open requests</h2><p className="mt-1 text-sm text-[#667085]">{data.cards.latestErasure ? `Last one closed ${formatDate(data.cards.latestErasure)}` : "No requests have been closed yet"} · {data.cards.closedThisYear} closed this year</p></div>}
  </div>
}

function RetentionTab({ data }: { data: AdminPrivacyData }) {
  return <div className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm">
    <div className="m-4 rounded-xl bg-[#EEF1F4] p-4 text-sm text-[#344054]"><p className="font-semibold text-[#101828]"><LockKeyhole className="mr-1.5 inline size-4" aria-hidden />Nothing is deleted on a timer.</p><p className="mt-1 leading-6">Every policy is off and has no time window, on purpose, until the owner sets the periods. Some licensing records may have a legal minimum keep period, so check before turning one on. Turning one on is an admin-only change.</p></div>
    {data.activePolicies ? <p className="mx-4 mb-3 rounded-lg bg-[#FFF4E5] p-3 text-sm font-medium text-[#8A3A05]">{data.activePolicies} policies are on and deleting data on a schedule.</p> : null}
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="bg-[#F7F5EF] font-mono text-[10px] uppercase tracking-[.11em] text-[#667085]"><tr><th className="px-4 py-3">Policy</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Note</th></tr></thead><tbody>{data.policies.map((policy) => <tr key={policy.key} className="border-t border-black/[.07] align-top"><td className="px-4 py-4"><strong className="block text-[#101828]">{policy.label}</strong><span className="mt-1 block max-w-sm text-xs leading-5 text-[#667085]">{policy.description}</span></td><td className="px-4 py-4 font-mono text-xs uppercase text-[#475467]">{policy.action}</td><td className="px-4 py-4"><span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", policy.enabled && policy.retainDays ? "bg-[#FFF4E5] text-[#8A3A05]" : "bg-[#EEF1F4] text-[#667085]")}>{policy.enabled && policy.retainDays ? `${policy.retainDays} days · ON` : "OFF · no window"}</span></td><td className="max-w-md px-4 py-4 text-xs leading-5 text-[#667085]">{policy.notes || "—"}</td></tr>)}</tbody></table></div>
  </div>
}

function ErasureLogTab({ data, showAll = false }: { data: AdminPrivacyData; showAll?: boolean }) {
  const entries = showAll ? data.erasures : data.erasures.slice(0, 10)
  return <div className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left text-sm"><thead className="bg-[#F7F5EF] font-mono text-[10px] uppercase tracking-[.11em] text-[#667085]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Who asked</th><th className="px-4 py-3">What happened</th><th className="px-4 py-3">By</th></tr></thead><tbody>{entries.length ? entries.map((entry) => <tr key={entry.id} className="border-t border-black/[.07] align-top"><td className="whitespace-nowrap px-4 py-4 text-xs text-[#475467]">{formatDate(entry.createdAt)}</td><td className="px-4 py-4"><strong className="block text-[#101828]">{entry.who}</strong><span className="mt-1 block text-xs text-[#667085]">{entry.caseRef} · deletion request</span></td><td className="px-4 py-4"><div className="flex max-w-lg flex-wrap gap-1.5">{Object.entries(entry.surfaces).map(([key, value]) => value ? <span key={key} className={cn("rounded-md px-2 py-1 font-mono text-[10px]", key === "signature_events_minimized" ? "bg-[#F1E9FF] text-[#6D28D9]" : "bg-[#EEF1F4] text-[#475467]")}>{key === "signature_events_minimized" ? `signatures ${value} · minimized` : `${ERASURE_SURFACE_LABELS[key as keyof typeof ERASURE_SURFACE_LABELS] ?? key} ${value}`}</span> : null)}</div></td><td className="px-4 py-4 text-xs text-[#475467]">{entry.actor}</td></tr>) : <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#667085]">No erasures recorded.</td></tr>}</tbody></table></div>{data.erasures.length > 10 && !showAll ? <div className="border-t border-black/[.07] p-3 text-center"><Button asChild variant="ghost" size="sm"><Link href={pageHref({ tab: "erasure" }) + "&all=1"}>Show all</Link></Button></div> : null}</div>
}

function ClosedTab({ data }: { data: AdminPrivacyData }) {
  return <div className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm"><ul className="divide-y divide-black/[.07]">{data.closed.length ? data.closed.map((request) => <li key={request.id} className="grid gap-3 px-4 py-4 md:grid-cols-[110px_minmax(150px,.7fr)_minmax(220px,1.4fr)_110px_auto] md:items-center"><KindChip kind={request.kind} /><div><strong className="block truncate text-sm">{request.clientName || request.requesterEmail}</strong><span className="block truncate text-xs text-[#667085]">{request.caseErased ? "Case erased" : request.requesterEmail}</span></div><p className="text-sm leading-6 text-[#475467]">{request.resolutionNote || "No resolution note recorded"}</p><time className="text-xs text-[#667085]">{formatDate(request.fulfilledAt ?? request.requestedAt)}</time><span className={cn("w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold", request.status === "refused" ? "bg-[#EEF1F4] text-[#667085]" : "bg-[#E8F5EE] text-[#16734A]")}>{request.status === "refused" ? "Refused" : request.kind === "deletion" && request.resolutionNote?.startsWith("Erased:") ? "Erased" : "Done"}</span></li>) : <li className="px-4 py-10 text-center text-sm text-[#667085]">No closed requests.</li>}</ul></div>
}

function ReviewErasure({ request, preview, error, pending, onBack, onRefuse, onErase, onRetry }: { request: PrivacyRequestView; preview: ErasurePreview | null; error: string | null; pending: boolean; onBack: () => void; onRefuse: () => void; onErase: () => void; onRetry: () => void }) {
  const eraseRows = preview ? ERASURE_DELETE_TABLES.map((key) => ({ key, label: ERASURE_SURFACE_LABELS[key], count: preview.erase[key] ?? 0 })).filter((row) => row.count > 0) : []
  const identityMatches = !!request.clientEmail && request.clientEmail.toLowerCase() === request.requesterEmail.toLowerCase()
  return <section className="rounded-2xl border border-black/[.08] bg-white shadow-sm">
    <div className="border-b border-black/[.08] px-5 py-5 md:px-7"><div className="flex items-center gap-2 text-xs font-semibold text-[#667085]"><span className="text-[#21845A]">Acknowledge ✓</span><span>·</span><span className="text-[#8A5D08]">Review what&apos;s erased</span><span>·</span><span>Erase</span></div><h2 className="mt-4 font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">{request.clientName} wants their data deleted</h2><p className="mt-2 text-sm text-[#667085]">{request.caseLine} · {request.requesterEmail} · received {formatDate(request.requestedAt)}</p>{request.detail ? <blockquote className="mt-4 border-l-[3px] border-[#D9B25F] pl-4 text-sm italic text-[#475467]">“{request.detail}”</blockquote> : null}</div>
    {error ? <div className="m-5 rounded-xl border border-[#F4B8B2] bg-[#FFF3F2] p-5 text-sm text-[#912018]"><p className="font-semibold">Couldn&apos;t load the erasure review.</p><p className="mt-1">{error}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>Retry</Button></div> : !preview ? <div className="grid gap-4 p-5 md:grid-cols-3" aria-label="Loading erasure preview" aria-busy="true">{[1, 2, 3].map((key) => <div key={key} className="h-48 animate-pulse rounded-xl bg-[#F2F4F7]" />)}</div> : <>
      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-7"><div className="rounded-xl border border-[#F0B8B4] bg-[#FFF7F6] p-4"><h3 className="font-semibold text-[#B42318]">Will be erased</h3><ul className="mt-3 space-y-2 text-sm text-[#475467]">{eraseRows.length ? eraseRows.map((row) => <li key={row.key} className="flex justify-between gap-3"><span>{row.label}</span><strong className="font-mono text-[#101828]">{row.count}</strong></li>) : <li>No case records remain</li>}{preview.files ? <li className="flex justify-between gap-3"><span>Stored files</span><strong className="font-mono text-[#101828]">{preview.files}</strong></li> : null}</ul></div><div className="rounded-xl border border-[#D9C7F8] bg-[#F8F4FF] p-4"><h3 className="font-semibold text-[#6D28D9]">Kept, personal details removed</h3><ul className="mt-3 space-y-2 text-sm text-[#475467]">{Object.entries(preview.minimize).filter(([, count]) => count > 0).map(([key, count]) => <li key={key} className="flex justify-between gap-3"><span>{ERASURE_SURFACE_LABELS[key as keyof typeof ERASURE_SURFACE_LABELS] ?? key}</span><strong className="font-mono text-[#101828]">{count}</strong></li>)}{Object.values(preview.minimize).every((count) => count === 0) ? <li>No signing records</li> : null}</ul><p className="mt-3 text-xs leading-5 text-[#667085]">Proof of e-signature stays; IP address and browser are removed.</p></div><div className="rounded-xl border border-[#D0D5DD] bg-[#F8F9FB] p-4"><h3 className="font-semibold text-[#344054]">Not changed</h3><ul className="mt-3 space-y-2 text-sm text-[#475467]"><li>Client name and email</li><li className="flex justify-between gap-3"><span>Payments</span><strong className="font-mono text-[#101828]">{request.paymentCount}</strong></li><li>Erasure receipt</li></ul><p className="mt-3 text-xs leading-5 text-[#667085]">The receipt is written before anything is erased.</p></div></div>
      <div className="mx-5 mb-5 space-y-2 rounded-xl bg-[#F8F9FB] p-4 text-sm md:mx-7"><p className={identityMatches ? "text-[#16734A]" : "text-[#8A3A05]"}>{identityMatches ? "✓ Identity confirmed: the request came from the email on file." : "The request email doesn't match the email on file. Confirm it's really them first."}</p><p className={!request.filed && request.paymentCount === 0 ? "text-[#16734A]" : "text-[#8A3A05]"}>{!request.filed && request.paymentCount === 0 ? "✓ Case was never filed with the NYPD and has no payments." : request.filed ? "This case was filed with the NYPD." : `This case has ${request.paymentCount} payments; they're kept.`}</p>{request.paymentCount > 0 && request.filed ? <p className="text-[#8A3A05]">This case has {request.paymentCount} payments; they&apos;re kept.</p> : null}<p className="text-[#8A3A05]">This can&apos;t be undone. Counts are checked again when you erase.</p></div>
    </>}
    <footer className="flex flex-col-reverse gap-2 border-t border-black/[.08] bg-[#F8F9FB] p-4 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onRefuse}><Ban className="size-4" aria-hidden />Refuse…</Button><Button type="button" variant="outline" onClick={onBack}>Back</Button><Button type="button" disabled={!preview || pending} onClick={onErase} className="bg-[#B42318] text-white hover:bg-[#912018]"><Trash2 className="size-4" aria-hidden />Continue to erase…</Button></footer>
  </section>
}

export function PrivacyWorkspace({ data, tab, explicitSelection, review, showAllLog }: { data: AdminPrivacyData; tab: PrivacyTab; explicitSelection: boolean; review: boolean; showAllLog: boolean }) {
  const router = useRouter()
  const [mobileTab, setMobileTab] = useState<"open" | "closed" | "retention">("open")
  const selected = data.open.find((request) => request.id === data.selectedId) ?? null
  const [dialog, setDialog] = useState<DialogState>(null)
  const [note, setNote] = useState("")
  const [choice, setChoice] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [previewState, setPreviewState] = useState<{ requestId: string; preview: ErasurePreview | null; error: string | null } | null>(null)
  const [erasureError, setErasureError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const oldest = data.open[0]
  const dialogRequest = dialog?.request ?? null

  const previewRequestId = review && selected?.kind === "deletion" && data.isAdmin ? selected.id : null
  useEffect(() => {
    if (!previewRequestId) return
    let current = true
    startTransition(async () => {
      const result = await previewDataErasure(previewRequestId)
      if (!current) return
      setPreviewState({ requestId: previewRequestId, preview: result.preview ?? null, error: result.error ?? null })
    })
    return () => { current = false }
  }, [previewRequestId])

  const preview = previewState?.requestId === previewRequestId ? previewState.preview : null
  const previewError = previewState?.requestId === previewRequestId ? previewState.error : null
  const previewTotal = useMemo(() => preview ? Object.values(preview.erase).reduce((sum, count) => sum + count, 0) + Object.values(preview.minimize).reduce((sum, count) => sum + count, 0) : 0, [preview])

  function acknowledge(request: PrivacyRequestView) {
    const form = new FormData()
    form.set("id", request.id)
    startTransition(async () => {
      const result = await acknowledgeDataRequest(form)
      if (result.error) toast.error(result.error)
      else { toast.success("Acknowledged. Let the applicant know from the case page."); router.refresh() }
    })
  }

  function openDialog(state: DialogState) {
    setNote("")
    setChoice("")
    setConfirmation("")
    setErasureError(null)
    setDialog(state)
  }

  function resolve() {
    if (!dialogRequest || !dialog || note.trim().length < 1) return
    const form = new FormData()
    form.set("id", dialogRequest.id)
    form.set("status", dialog.kind === "refuse" ? "refused" : "fulfilled")
    form.set("resolution_note", dialog.kind === "done" ? `${choice}: ${note.trim()}` : note.trim())
    startTransition(async () => {
      const result = await resolveDataRequest(form)
      if (result.error) toast.error(result.error)
      else { toast.success(dialog.kind === "refuse" ? "Request refused." : "Request marked done."); setDialog(null); router.refresh() }
    })
  }

  function erase() {
    if (!dialogRequest || confirmation !== "ERASE") return
    const form = new FormData()
    form.set("id", dialogRequest.id)
    form.set("confirm", confirmation)
    startTransition(async () => {
      const result = await executeErasure(form)
      if (result.error) { setErasureError(result.error); return }
      toast.success("Erased and recorded.")
      setDialog(null)
      router.push(pageHref({ tab: "closed" }))
      router.refresh()
    })
  }

  function retryPreview() {
    if (!selected) return
    startTransition(async () => {
      const result = await previewDataErasure(selected.id)
      setPreviewState({ requestId: selected.id, preview: result.preview ?? null, error: result.error ?? null })
    })
  }

  const tabs: Array<{ key: PrivacyTab; label: string }> = [{ key: "retention", label: "Retention" }, { key: "erasure", label: "Erasure log" }, { key: "closed", label: `Closed · ${data.closed.length}` }]
  if (review && selected && data.isAdmin) return <div className="mx-auto max-w-[1480px] pb-12"><div className="rounded-2xl border border-black/[.08] bg-white p-6 text-center md:hidden"><LockKeyhole className="mx-auto size-6 text-[#14254A]" aria-hidden /><h1 className="mt-3 font-[family-name:var(--font-title)] text-2xl font-semibold">Erasure is done from a computer</h1><p className="mt-2 text-sm text-[#667085]">Use a tablet or desktop to review records and continue.</p><Button type="button" variant="outline" className="mt-4" onClick={() => router.push(pageHref({ request: selected.id, tab }))}>Back to request</Button></div><div className="hidden md:block"><ReviewErasure request={selected} preview={preview} error={previewError} pending={pending} onBack={() => router.push(pageHref({ request: selected.id, tab }))} onRefuse={() => openDialog({ kind: "refuse", request: selected })} onErase={() => openDialog({ kind: "erase", request: selected })} onRetry={retryPreview} /></div>{dialog ? <PrivacyDialog state={dialog} choice={choice} note={note} confirmation={confirmation} pending={pending} previewTotal={previewTotal} previewFiles={preview?.files ?? 0} error={erasureError} onChoice={setChoice} onNote={setNote} onConfirmation={setConfirmation} onClose={() => setDialog(null)} onResolve={resolve} onErase={erase} onOpenLog={() => { setDialog(null); router.push(pageHref({ tab: "erasure" })) }} /> : null}</div>

  return <div className="mx-auto max-w-[1480px] pb-12">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="font-[family-name:var(--font-title)] text-[32px] font-semibold leading-tight text-[#101828]">Privacy</h1><p className="mt-1 hidden text-sm text-[#667085] sm:block">Access, correction and deletion requests from applicants, and what we keep.</p><p className="mt-1 text-sm text-[#667085] sm:hidden">{data.counts.total} open · oldest {data.counts.oldestDays} days</p></div><Button asChild variant="outline" className="hidden sm:inline-flex"><Link href="/admin/privacy/data-inventory"><Database className="size-4" aria-hidden />What we hold</Link></Button></header>

    <section aria-label="Privacy request summary" className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4"><SummaryCard label="Open requests" value={data.counts.total} detail={`${data.counts.access} access · ${data.counts.correction} correction · ${data.counts.deletion} deletion`} /><SummaryCard label="Oldest waiting" value={data.counts.oldestDays} suffix="days" detail={oldest ? `${oldest.clientName} · ${KIND_META[oldest.kind].label}` : "No requests waiting"} tone={oldest?.timing.tone} /><SummaryCard label="Closed this year" value={data.cards.closedThisYear} detail={`median ${data.cards.medianDaysToClose ?? 0} days to close`} /><SummaryCard label="Data erased" value={data.cards.erasedThisYear} detail={data.cards.latestErasure ? `${formatDate(data.cards.latestErasure)} · receipt kept` : "No erasures this year"} /></section>

    <div role="tablist" aria-label="Privacy sections" className="mt-5 grid grid-cols-3 rounded-xl border border-black/10 bg-white p-1 md:hidden">{([{ key: "open", label: `Open ${data.open.length}` }, { key: "closed", label: "Closed" }, { key: "retention", label: "Retention" }] as const).map((item) => <button key={item.key} type="button" role="tab" aria-selected={mobileTab === item.key} onClick={() => setMobileTab(item.key)} className={cn("rounded-lg px-2 py-2 text-xs font-semibold", mobileTab === item.key ? "bg-[#14254A] text-white" : "text-[#667085]")}>{item.label}</button>)}</div>

    <div className={cn("mt-5 grid min-w-0 gap-5", selected && "xl:grid-cols-[minmax(0,1fr)_380px]")}>
      <div className="min-w-0">
        <div className="hidden md:block"><RequestTable data={data} selectedId={data.selectedId} tab={tab} /></div>
        <div className="md:hidden">{mobileTab === "open" ? <>{data.open.length ? <ul className="space-y-3">{data.open.map((request) => <li key={request.id} className="rounded-2xl border border-black/[.08] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><KindChip kind={request.kind} /><Progress status={request.status} /></div><h2 className="mt-3 text-base font-semibold">{request.clientName}</h2><p className="mt-1 text-xs text-[#667085]">{request.caseLine}</p><div className="mt-4"><Waiting request={request} compact /></div><div className="mt-4 flex gap-2">{request.status === "open" ? <Button type="button" size="sm" disabled={pending} onClick={() => acknowledge(request)} className="flex-1 bg-[#14254A] text-white">Acknowledge</Button> : null}<Button asChild size="sm" variant="outline" className="flex-1"><Link href={pageHref({ request: request.id, tab })}>Open</Link></Button></div></li>)}</ul> : <div className="rounded-2xl border border-black/[.08] bg-white px-5 py-10 text-center"><CheckCircle2 className="mx-auto size-8 text-[#16734A]" aria-hidden /><h2 className="mt-3 font-[family-name:var(--font-title)] text-2xl font-semibold">No open requests</h2><p className="mt-1 text-sm text-[#667085]">{data.cards.closedThisYear} closed this year</p></div>}<p className="mt-3 rounded-lg bg-[#EEF1F4] p-3 text-center text-xs text-[#475467]"><LockKeyhole className="mr-1 inline size-3.5" aria-hidden />Erasure is done from a computer.</p></> : mobileTab === "closed" ? <ClosedTab data={data} /> : <RetentionTab data={data} />}</div>

        <div className="mt-5 hidden border-b border-black/10 md:flex" role="tablist" aria-label="Privacy records">{tabs.map((item) => <Link key={item.key} role="tab" aria-selected={tab === item.key} href={pageHref({ request: data.selectedId, tab: item.key })} className={cn("border-b-2 px-4 py-3 text-sm font-semibold", tab === item.key ? "border-[#14254A] text-[#14254A]" : "border-transparent text-[#667085]")}>{item.label}</Link>)}</div>
        <div className="mt-4 hidden md:block">{tab === "retention" ? <RetentionTab data={data} /> : tab === "erasure" ? <ErasureLogTab data={data} showAll={showAllLog} /> : <ClosedTab data={data} />}</div>
      </div>
      {selected ? <aside className="hidden overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm xl:block"><DetailPanel request={selected} isAdmin={data.isAdmin} pending={pending} onAcknowledge={acknowledge} onDialog={openDialog} onReview={(request) => router.push(pageHref({ request: request.id, tab, review: true }))} /></aside> : null}
    </div>

    <Sheet open={explicitSelection && !!selected} onOpenChange={(open) => { if (!open) router.push(pageHref({ tab })) }}><SheetContent side="right" className="w-full overflow-y-auto bg-white p-0 text-[#101828] sm:max-w-[480px] xl:hidden"><SheetHeader className="sr-only"><SheetTitle>Privacy request</SheetTitle><SheetDescription>Request details and actions</SheetDescription></SheetHeader>{selected ? <DetailPanel request={selected} isAdmin={data.isAdmin} pending={pending} onAcknowledge={acknowledge} onDialog={openDialog} onReview={(request) => router.push(pageHref({ request: request.id, tab, review: true }))} /> : null}</SheetContent></Sheet>

    <footer className="mb-16 mt-6 border-t border-black/10 pt-4 text-xs leading-5 text-[#667085] md:mb-0">Erasure is admin-only, can&apos;t be undone, and is recorded before it runs. Signing records are kept with personal details removed, and <Link href="/portal/privacy" className="font-semibold text-[#14254A] underline">the applicant is told this</Link>.</footer>
    {dialog ? <PrivacyDialog state={dialog} choice={choice} note={note} confirmation={confirmation} pending={pending} previewTotal={previewTotal} previewFiles={preview?.files ?? 0} error={erasureError} onChoice={setChoice} onNote={setNote} onConfirmation={setConfirmation} onClose={() => setDialog(null)} onResolve={resolve} onErase={erase} onOpenLog={() => { setDialog(null); router.push(pageHref({ tab: "erasure" })) }} /> : null}
  </div>
}

function SummaryCard({ label, value, suffix, detail, tone }: { label: string; value: number; suffix?: string; detail: string; tone?: "navy" | "amber" | "red" }) {
  return <article className="rounded-2xl border border-black/[.08] bg-white p-4 shadow-sm"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[#667085]">{label}</p><p className={cn("mt-2 font-[family-name:var(--font-title)] text-3xl font-semibold", tone === "red" ? "text-[#B42318]" : tone === "amber" ? "text-[#9A6B10]" : "text-[#101828]")}>{value}{suffix ? <span className="pl-1 font-sans text-sm font-medium">{suffix}</span> : null}</p><p className="mt-1 truncate text-xs text-[#667085]">{detail}</p></article>
}

function PrivacyDialog({ state, choice, note, confirmation, pending, previewTotal, previewFiles, error, onChoice, onNote, onConfirmation, onClose, onResolve, onErase, onOpenLog }: { state: NonNullable<DialogState>; choice: string; note: string; confirmation: string; pending: boolean; previewTotal: number; previewFiles: number; error: string | null; onChoice: (value: string) => void; onNote: (value: string) => void; onConfirmation: (value: string) => void; onClose: () => void; onResolve: () => void; onErase: () => void; onOpenLog: () => void }) {
  const request = state.request
  const doneChoices = request.kind === "access" ? ["Sent a copy by secure link", "Sent by email attachment", "Other"] : ["Updated as asked", "Partly updated", "Other"]
  const validDone = choice.length > 0 && note.trim().length > 0 && note.length <= 1000
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }}><DialogContent className="max-h-[92svh] overflow-y-auto bg-white text-[#101828] sm:max-w-lg"><DialogHeader><DialogTitle className="font-[family-name:var(--font-title)] text-2xl font-semibold">{state.kind === "done" ? `Mark ${KIND_META[request.kind].label.toLowerCase()} request done` : state.kind === "refuse" ? "Refuse this request" : `Erase ${request.clientName}'s case data`}</DialogTitle><DialogDescription>{request.clientName} · {request.caseRef ?? "case unavailable"}{state.kind === "erase" ? ` · ${previewTotal} records and ${previewFiles} files` : ""}</DialogDescription></DialogHeader>
    {state.kind === "done" ? <div className="space-y-4"> <fieldset><legend className="text-sm font-semibold">Result</legend><div className="mt-2 space-y-2">{doneChoices.map((value) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="privacy-choice" value={value} checked={choice === value} onChange={() => onChoice(value)} className="accent-[#14254A]" />{value}</label>)}</div></fieldset><NoteField id="privacy-done-note" label={request.kind === "access" ? "What was sent" : "What changed"} value={note} onChange={onNote} /></div> : null}
    {state.kind === "refuse" ? <div className="space-y-3"><NoteField id="privacy-refuse-note" label="Reason for refusing" value={note} onChange={onNote} /><p className="text-xs"><Link href={request.caseId ? `/admin/cases/${request.caseId}?tab=messages` : "/admin/inbox"} className="font-semibold text-[#14254A] underline">Message them from the case page</Link></p></div> : null}
    {state.kind === "erase" ? <div className="space-y-4"><div className="rounded-xl border border-[#F0B8B4] bg-[#FFF3F2] p-4 text-sm leading-6 text-[#912018]">This permanently removes this case&apos;s disclosures, intake and questionnaire answers, documents (including the stored files), household and reference records, notes and messages. Proof-of-signing records are retained and minimized, as disclosed to the applicant. <strong>It can&apos;t be undone.</strong></div>{error ? <div role="alert" className="rounded-xl border border-[#F0B8B4] bg-[#FFF3F2] p-4 text-sm text-[#912018]"><p className="font-semibold">Erasure stopped.</p><p className="mt-1">Nothing after the failed step ran, and the receipt says so. Check the erasure log before trying again.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpenLog}>Open log</Button></div> : <div className="space-y-2"><Label htmlFor="erase-confirmation">Type ERASE to confirm</Label><Input id="erase-confirmation" autoComplete="off" value={confirmation} onChange={(event) => onConfirmation(event.target.value)} aria-describedby="erase-help" /><p id="erase-help" className="text-xs text-[#667085]">The Erase button unlocks only when the confirmation matches exactly.</p></div>}</div> : null}
    <DialogFooter className="bg-[#F8F9FB]"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>{state.kind === "done" ? <Button type="button" disabled={!validDone || pending} onClick={onResolve} className="bg-[#14254A] text-white">Mark done</Button> : state.kind === "refuse" ? <Button type="button" disabled={!note.trim() || note.length > 1000 || pending} onClick={onResolve}>Refuse request</Button> : !error ? <span tabIndex={confirmation === "ERASE" ? -1 : 0} title={confirmation === "ERASE" ? undefined : "Type ERASE exactly to enable this button"}><Button type="button" disabled={confirmation !== "ERASE" || pending} onClick={onErase} className="bg-[#B42318] text-white hover:bg-[#912018]"><Trash2 className="size-4" aria-hidden />{pending ? "Erasing…" : "Erase"}</Button></span> : null}</DialogFooter>
  </DialogContent></Dialog>
}

function NoteField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><textarea id={id} value={value} maxLength={1000} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-lg border border-black/15 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#14254A]/25" required /><div className="flex justify-between gap-3 text-xs text-[#667085]"><span>The applicant sees this note on their Privacy page.</span><span>{value.length}/1000</span></div></div>
}
