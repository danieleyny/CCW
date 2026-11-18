"use client"

import Link from "next/link"
import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Ban, Check, CheckCircle2, ExternalLink, FileText, Loader2, MessageSquare, RotateCcw, Scale, Send, X } from "lucide-react"
import { toast } from "sonner"
import { postMessage, reviewDocument, setCaseRequirementStatus } from "@/app/admin/actions"
import { CaseNotes, type NoteRow } from "@/components/admin/case-notes"
import type { DocRow } from "@/components/admin/document-review"
import { StaffInstructorThread } from "@/components/admin/training-controls"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { actionFor, actionWetInk } from "@/lib/requirements/actions"
import { cn } from "@/lib/utils"

export interface WorkbenchRequirement {
  id: string
  reqCode: string
  title: string
  description: string | null
  authority: string | null
  legalStatus: string
  verifiedOn: string | null
  needsLegalReview: boolean
  blocking: boolean
  severity: string
  status: string
  notes: string | null
  documentId: string | null
  referenceId: string | null
  cohabitantId: string | null
  updatedAt: string
  thirdPartyStatus: string | null
}

interface InstructorMessage {
  id: string
  body: string
  createdAt: string
  senderName: string | null
  senderRole: string | null
}

interface ChecklistProps {
  caseId: string
  clientId: string
  clientFirstName: string
  requirements: WorkbenchRequirement[]
  documents: DocRow[]
  selectedId: string | null
  messages: MessageRow[]
  notes: NoteRow[]
  engagementId: string | null
  instructorMessages: InstructorMessage[]
  openDocument: (documentId: string) => Promise<{ url?: string; error?: string }>
}

const BASE_REASONS = ["Blurry or unreadable", "Wrong document for this requirement", "Expired or out of date", "Missing a page or detail"]
const NOTARY_REASONS = ["Not notarized", "Signed before it was notarized"]
const WITNESS_REASONS = ["Not witnessed", "Missing witness signature or printed name", "Signed before the witness"]

function rejectionReasons(reqCode: string) {
  return [...BASE_REASONS, ...(actionWetInk(actionFor(reqCode)) === "witness" ? WITNESS_REASONS : NOTARY_REASONS), "Other"]
}

function whoActs(requirement: WorkbenchRequirement, documents: DocRow[]) {
  if (["satisfied", "na"].includes(requirement.status)) return "Done"
  const pendingDoc = documents.some((document) => (document.reqCode === requirement.reqCode || document.id === requirement.documentId) && document.status === "pending" && (!document.generated || !!document.signed_at))
  if (pendingDoc) return "Staff to review"
  if (requirement.referenceId || requirement.cohabitantId) return "Third party"
  return "Applicant to send"
}

function topicFor(code: string) {
  if (/^(REF)/.test(code)) return "References"
  if (/^(COH|SAFE)/.test(code)) return "Household & safeguard"
  if (/^(TRN|RNW)/.test(code)) return "Training"
  if (/^(DIS|ARR|SOC)/.test(code)) return "Disclosures"
  if (/^(ID|DOB|RES|PHO)/.test(code)) return "Identity & residence"
  return "Application"
}

export function ChecklistWorkbench(props: ChecklistProps) {
  const router = useRouter()
  const [grouping, setGrouping] = useState<"who" | "topic">("who")
  const [blockingOnly, setBlockingOnly] = useState(false)
  const [lane, setLane] = useState<"client" | "notes" | "instructor">("client")
  const [draftSeed, setDraftSeed] = useState("")
  const [rejecting, setRejecting] = useState<DocRow | null>(null)
  const [reason, setReason] = useState("")
  const [detail, setDetail] = useState("")
  const [pending, start] = useTransition()
  const reviewBar = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => blockingOnly ? props.requirements.filter((item) => item.blocking && item.status !== "na") : props.requirements, [blockingOnly, props.requirements])
  const ordered = useMemo(() => [...visible].sort((a, b) => {
    const rank = ["Staff to review", "Applicant to send", "Third party", "Done"]
    return rank.indexOf(whoActs(a, props.documents)) - rank.indexOf(whoActs(b, props.documents)) || a.reqCode.localeCompare(b.reqCode)
  }), [visible, props.documents])
  const selected = ordered.find((item) => item.id === props.selectedId) ?? ordered[0] ?? null
  const groups = useMemo(() => {
    const map = new Map<string, WorkbenchRequirement[]>()
    for (const item of ordered) {
      const key = grouping === "who" ? whoActs(item, props.documents) : topicFor(item.reqCode)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()]
  }, [grouping, ordered, props.documents])
  const itemDocs = selected ? props.documents.filter((document) => document.reqCode === selected.reqCode || document.id === selected.documentId).sort((a, b) => b.version - a.version) : []
  const latestDoc = itemDocs[0] ?? null
  const reviewableDoc = itemDocs.find((document) => document.status === "pending" && (!document.generated || !!document.signed_at)) ?? null
  const matchedMessage = selected ? [...props.messages].reverse().slice(0, 5).find((message) => message.senderRole === "client" && message.body.toLowerCase().includes(selected.title.toLowerCase())) : null
  const done = props.requirements.filter((item) => ["satisfied", "na"].includes(item.status)).length

  function navigate(id: string) {
    router.replace(`/admin/cases/${props.caseId}?tab=checklist&req=${id}`, { scroll: false })
  }

  function advance() {
    const staffItems = ordered.filter((item) => whoActs(item, props.documents) === "Staff to review" && item.id !== selected?.id)
    if (staffItems[0]) navigate(staffItems[0].id)
    router.refresh()
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selected || !["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) return
    event.preventDefault()
    if (event.key === "Enter") { reviewBar.current?.focus(); return }
    const index = ordered.findIndex((item) => item.id === selected.id)
    const next = event.key === "ArrowDown" ? Math.min(ordered.length - 1, index + 1) : Math.max(0, index - 1)
    if (ordered[next]) navigate(ordered[next].id)
  }

  function approve(document: DocRow) {
    if (!selected) return
    start(async () => {
      try {
        await reviewDocument({ documentId: document.id, caseId: props.caseId, clientId: props.clientId, status: "approved" })
        toast.success(`Accepted ${selected.title}`)
        advance()
      } catch { toast.error("Couldn't accept the document.") }
    })
  }

  function reject() {
    if (!rejecting || !selected) return
    const trimmed = detail.trim()
    const notes = reason === "Other" ? trimmed : trimmed ? `${reason} — ${trimmed}` : reason
    if (!notes) { toast.error(reason === "Other" ? "Add a short explanation." : "Pick a reason."); return }
    start(async () => {
      try {
        await reviewDocument({ documentId: rejecting.id, caseId: props.caseId, clientId: props.clientId, status: "rejected", notes })
        toast.success("Replacement requested and the client was notified.")
        setRejecting(null); setReason(""); setDetail(""); advance()
      } catch { toast.error("Couldn't request a replacement.") }
    })
  }

  function setStatus(status: "pending" | "satisfied" | "na") {
    if (!selected) return
    const verb = status === "satisfied" ? "Mark satisfied" : status === "na" ? "Mark N/A" : "Reopen"
    if (!window.confirm(`${verb}: ${selected.title}? This is logged.`)) return
    start(async () => {
      const result = await setCaseRequirementStatus(selected.id, props.caseId, status)
      if (!result.ok) toast.error(result.error)
      else { toast.success(`${selected.reqCode} updated`); router.refresh() }
    })
  }

  function messageAbout() {
    if (!selected) return
    setLane("client")
    setDraftSeed(`About your ${selected.title}: `)
  }

  if (!selected) return <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-text-low">No checklist items have been generated for this case.</div>

  const actor = whoActs(selected, props.documents)
  const verified = !!selected.verifiedOn && !selected.needsLegalReview && selected.legalStatus === "enforced"

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <aside className={cn("min-w-0 rounded-2xl border border-hairline bg-card md:block", props.selectedId && "hidden")} aria-label="Checklist items">
        <div className="border-b border-hairline p-3">
          <div className="flex items-center justify-between"><b className="text-sm">{done}/{props.requirements.length} done</b><button type="button" onClick={() => setBlockingOnly((value) => !value)} className="text-xs font-medium text-signal">{blockingOnly ? "Show all" : "Blocking only"}</button></div>
          <div className="mt-3 grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-xs"><button type="button" onClick={() => setGrouping("who")} className={cn("min-h-9 rounded-md", grouping === "who" && "bg-card font-semibold shadow-sm")}>Who acts</button><button type="button" onClick={() => setGrouping("topic")} className={cn("min-h-9 rounded-md", grouping === "topic" && "bg-card font-semibold shadow-sm")}>Topic</button></div>
        </div>
        <div role="listbox" aria-label="Requirements" tabIndex={0} onKeyDown={onListKeyDown} className="max-h-[68dvh] overflow-y-auto p-2 outline-none">
          {groups.map(([group, items]) => {
            const rows = <RequirementRows items={items} selectedId={selected.id} documents={props.documents} onSelect={navigate} />
            return grouping === "who" && group === "Done" ? (
              <details key={group} className="mb-3 last:mb-0">
                <summary className="cursor-pointer rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-text-low hover:bg-surface-2">{group} · {items.length}</summary>
                {rows}
              </details>
            ) : (
              <section key={group} className="mb-3 last:mb-0">
                <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-text-low">{group} · {items.length}</h3>
                {rows}
              </section>
            )
          })}
        </div>
      </aside>

      <main className={cn("min-w-0 overflow-hidden rounded-2xl border border-hairline bg-card md:block", !props.selectedId && "hidden")} aria-label={selected.title}>
        <div className="border-b border-hairline p-4 sm:p-5">
          <Link href={`/admin/cases/${props.caseId}?tab=checklist`} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-signal md:hidden">← Back to checklist</Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="font-mono text-[10px] font-semibold tracking-wide text-brass-bright">{selected.reqCode}</p><h2 className="mt-1 font-display text-2xl sm:text-[26px]">{selected.title}</h2></div>
            <Button variant="outline" size="sm" onClick={messageAbout}><MessageSquare /> Message client about this</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-mid">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-brass" /> {actor}</span>
            <span>· {statusLine(selected, props.documents)}</span>
            <span className="rounded bg-surface-2 px-2 py-1 font-mono">{selected.authority ?? "Source not listed"}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium", verified ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn")}><Scale className="size-3" /> {verified ? "Attorney-verified" : "Awaiting attorney review"}</span>
          </div>
        </div>

        <div className="space-y-5 p-4 pb-32 sm:p-5 sm:pb-5">
          <section className="rounded-xl border border-hairline bg-surface-1 p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-text-mid">What we accept</h3><p className="mt-2 text-sm leading-relaxed text-text-mid">{selected.description ?? "No acceptance guidance has been added to the registry yet."}</p></section>

          {matchedMessage && <section className="rounded-xl border border-signal/20 bg-signal/8 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-signal">Recent client message mentioning this item</p><p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{matchedMessage.body}</p></section>}

          <section>
            <div className="flex items-center justify-between"><h3 className="font-display text-lg">Files</h3><span className="text-xs text-text-low">{itemDocs.length} version{itemDocs.length === 1 ? "" : "s"}</span></div>
            {latestDoc ? <div className="mt-2 space-y-2"><FileCard document={latestDoc} openDocument={props.openDocument} newest />{itemDocs.length > 1 && <details><summary className="cursor-pointer py-2 text-xs font-medium text-signal">Earlier versions ({itemDocs.length - 1})</summary><div className="space-y-2">{itemDocs.slice(1).map((document) => <FileCard key={document.id} document={document} openDocument={props.openDocument} />)}</div></details>}</div> : <div className="mt-2 rounded-xl border border-dashed p-6 text-center text-sm text-text-low">No file uploaded for this requirement.</div>}
          </section>

          {actor === "Third party" && <section className="rounded-xl border border-hairline bg-surface-1 p-4"><h3 className="text-sm font-semibold">Third-party journey</h3><p className="mt-2 text-sm capitalize text-text-mid">{selected.thirdPartyStatus?.replaceAll("_", " ") ?? "Not sent"}</p><Button asChild variant="outline" size="sm" className="mt-3"><Link href={`/admin/cases/${props.caseId}?tab=people`}>Open in People tab <ArrowRight /></Link></Button></section>}
          {actor === "Applicant to send" && <section className="rounded-xl border border-hairline bg-surface-1 p-4"><p className="text-sm text-text-mid">Waiting on the applicant since {new Date(selected.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</p><Button variant="outline" size="sm" className="mt-3" onClick={messageAbout}><Send /> Message client about this</Button></section>}
        </div>

        <div ref={reviewBar} tabIndex={-1} className="fixed inset-x-0 bottom-[76px] z-30 border-t border-hairline bg-card p-3 shadow-[0_-8px_24px_rgba(0,0,0,.08)] sm:static sm:shadow-none">
          {reviewableDoc ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Button aria-label={`Accept ${selected.title}`} className="bg-ok text-white hover:bg-ok/90" disabled={pending} onClick={() => approve(reviewableDoc)}><Check /> Accept</Button><Button aria-label={`Request replacement for ${selected.title}`} variant="outline" className="border-danger/30 text-danger" disabled={pending} onClick={() => { setRejecting(reviewableDoc); setReason(""); setDetail(reviewableDoc.review_notes ?? "") }}><X /> Request replacement…</Button></div> : <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-xs text-text-low">{actor === "Done" ? "This item is complete." : "No document is waiting for review."}</span>{selected.status === "pending" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("satisfied")}><CheckCircle2 /> Mark satisfied</Button>}{selected.status === "pending" && !selected.blocking && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("na")}><Ban /> Mark N/A</Button>}{["satisfied", "na"].includes(selected.status) && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("pending")}><RotateCcw /> Reopen</Button>}</div>}
        </div>
      </main>

      <aside className="hidden min-w-0 overflow-hidden rounded-2xl border border-hairline bg-card xl:block">
        <div className="grid grid-cols-3 border-b border-hairline bg-surface-1 p-1 text-xs"><LaneButton active={lane === "client"} onClick={() => setLane("client")}>Client</LaneButton><LaneButton active={lane === "notes"} onClick={() => setLane("notes")}>Notes</LaneButton><LaneButton active={lane === "instructor"} onClick={() => setLane("instructor")}>Instructor</LaneButton></div>
        <div className={cn("max-h-[74dvh] overflow-y-auto p-3", lane === "client" && "bg-signal/[.025]", lane === "notes" && "bg-warn/[.035]", lane === "instructor" && "bg-purple-500/[.035]")}>
          {lane === "client" && <><p className="mb-3 text-[10px] uppercase tracking-wide text-signal">Client will see replies in their portal</p><MessageThread key={draftSeed || "blank"} caseId={props.caseId} messages={props.messages} send={postMessage} placeholder={`Reply to ${props.clientFirstName}…`} draftSeed={draftSeed} /></>}
          {lane === "notes" && <><p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-warn">Staff-only — never shown to the client</p><CaseNotes caseId={props.caseId} notes={props.notes} /></>}
          {lane === "instructor" && <><p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-purple-600">Private staff ↔ instructor lane</p><StaffInstructorThread caseId={props.caseId} engagementId={props.engagementId} messages={props.instructorMessages} /></>}
        </div>
      </aside>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request a replacement</DialogTitle><DialogDescription>Tell the client exactly what to correct. The request is logged and the client is notified.</DialogDescription></DialogHeader>
          <fieldset className="space-y-1.5">{rejectionReasons(selected.reqCode).map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-brass has-[:checked]:bg-brass/8"><input type="radio" name="reject-reason" checked={reason === item} onChange={() => setReason(item)} /> {item}</label>)}</fieldset>
          <Textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={reason === "Other" ? "Explain what needs to change." : "Optional note to the client…"} />
          <DialogFooter><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" disabled={pending} onClick={reject}>Send &amp; request replacement</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LaneButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={cn("min-h-9 rounded-md", active && "bg-card font-semibold shadow-sm")}>{children}</button> }

function RequirementRows({ items, selectedId, documents, onSelect }: { items: WorkbenchRequirement[]; selectedId: string; documents: DocRow[]; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const active = item.id === selectedId
        return <button key={item.id} type="button" role="option" aria-selected={active} onClick={() => onSelect(item.id)} className={cn("relative w-full rounded-lg px-3 py-2.5 text-left text-xs hover:bg-surface-2", active && "bg-brass/8 pl-4 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brass")}><span className={cn("block font-medium leading-snug", item.status === "na" && "text-text-low line-through")}>{item.title}</span><span className="mt-1 flex items-center gap-1.5 text-[10px] text-text-low"><StatusDot status={item.status} /> {statusLine(item, documents)}{!item.blocking && <span className="rounded bg-surface-3 px-1">Optional</span>}</span></button>
      })}
    </div>
  )
}

function StatusDot({ status }: { status: string }) { return status === "satisfied" ? <CheckCircle2 className="size-3 text-ok" /> : status === "rejected" ? <X className="size-3 text-danger" /> : status === "na" ? <Ban className="size-3 text-text-low" /> : <span className="size-1.5 rounded-full bg-warn" /> }

function statusLine(item: WorkbenchRequirement, documents: DocRow[]) {
  const actor = whoActs(item, documents)
  if (item.status === "satisfied") return "Satisfied"
  if (item.status === "na") return "Not applicable"
  if (item.status === "rejected") return "Replacement requested"
  if (actor === "Staff to review") return "Uploaded · awaiting review"
  if (actor === "Third party") return item.thirdPartyStatus?.replaceAll("_", " ") ?? "Waiting on third party"
  return "Waiting on applicant"
}

function FileCard({ document, openDocument, newest = false }: { document: DocRow; openDocument: ChecklistProps["openDocument"]; newest?: boolean }) {
  const [pending, start] = useTransition()
  return <div className="flex items-center gap-3 rounded-xl border border-hairline p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2"><FileText className="size-5 text-text-mid" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.file_name ?? document.type.replaceAll("_", " ")}</p><p className="mt-0.5 text-xs capitalize text-text-low">{newest ? "Newest · " : ""}version {document.version} · {document.status}</p></div>{document.hasFile && <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { const result = await openDocument(document.id); if (result.url) window.open(result.url, "_blank", "noopener,noreferrer"); else toast.error(result.error ?? "Couldn't open the file.") })}>{pending ? <Loader2 className="animate-spin" /> : <ExternalLink />} View</Button>}</div>
}
