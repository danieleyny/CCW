"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  FileArchive,
  ShieldAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Loader2,
  Lock,
  Square,
  CheckSquare,
} from "lucide-react"
import type { ApplicationTabData, PortalSlotView, SlotState } from "@/lib/portal/application-tab"
import type { WorksheetSection } from "@/lib/disclosures/worksheet-portal"
import { StepCard, useCopy } from "@/components/admin/portal-worksheet"

const PORTAL_URL = "https://licensing.nypdonline.org"

/**
 * The admin "Application" tab — the NYPD online portal transcribed onto one screen, in
 * the portal's own step order and headings, so a staffer files without leaving the case.
 * Internal work product; never shown to the applicant. Sensitive reads (SSN, document
 * files) happen ON CLICK through server actions, never at render.
 */
export function ApplicationTab({
  data,
  caseId,
  revealSsn,
  openDocument,
  setStepEntered,
  recordHref,
  uploadSetHref,
}: {
  data: ApplicationTabData
  caseId: string
  revealSsn: (caseId: string) => Promise<{ ssn?: string; error?: string }>
  openDocument: (documentId: string) => Promise<{ url?: string; error?: string }>
  setStepEntered: (caseId: string, stepNo: number, entered: boolean) => Promise<{ ok: true }>
  recordHref: string
  uploadSetHref: string
}) {
  const { sections, slots, heldForInterview, readiness, applicant, ssnConfigured } = data
  const [entered, setEntered] = useState<Set<number>>(() => new Set(data.enteredSteps))
  const [, startToggle] = useTransition()

  const toggle = (no: number) => {
    const next = new Set(entered)
    const now = !next.has(no)
    if (now) next.add(no)
    else next.delete(no)
    setEntered(next) // optimistic
    startToggle(async () => {
      await setStepEntered(caseId, no, now)
    })
  }

  const enteredCount = sections.filter((s) => entered.has(s.no)).length

  return (
    <div className="space-y-5">
      <Header
        applicant={applicant}
        readiness={readiness}
        ssnConfigured={ssnConfigured}
        caseId={caseId}
        revealSsn={revealSsn}
        recordHref={recordHref}
        uploadSetHref={uploadSetHref}
        enteredCount={enteredCount}
        totalSteps={sections.length}
      />
      <StepRail sections={sections} slots={slots} entered={entered} />
      <div className="space-y-6">
        {sections.map((section) => {
          const toggleEl = <StepToggle entered={entered.has(section.no)} onToggle={() => toggle(section.no)} />
          if (section.kind === "uploads") {
            return <DocumentsStep key={section.no} section={section} slots={slots} heldForInterview={heldForInterview} openDocument={openDocument} headerRight={toggleEl} />
          }
          if (section.kind === "checkpoint") {
            return <CheckpointCard key={section.no} section={section} headerRight={toggleEl} />
          }
          return <StepCard key={section.no} section={section} headerRight={toggleEl} />
        })}
      </div>
      <p className="text-xs text-text-low">
        Applicant: {applicant} · Internal work product — never given to the applicant. We prepare and record; the applicant files.
      </p>
    </div>
  )
}

/** "Mark entered" — staff tick a step off as they transcribe it. */
function StepToggle({ entered, onToggle }: { entered: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        entered ? "border-ok/40 bg-ok/10 text-ok" : "border-hairline text-text-low hover:bg-surface-3 hover:text-foreground"
      }`}
    >
      {entered ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
      {entered ? "Entered" : "Mark entered"}
    </button>
  )
}

/* ─────────────────────────── header ─────────────────────────── */

function Header({
  applicant,
  readiness,
  ssnConfigured,
  caseId,
  revealSsn,
  recordHref,
  uploadSetHref,
  enteredCount,
  totalSteps,
}: {
  applicant: string
  readiness: ApplicationTabData["readiness"]
  ssnConfigured: boolean
  caseId: string
  revealSsn: (caseId: string) => Promise<{ ssn?: string; error?: string }>
  recordHref: string
  uploadSetHref: string
  enteredCount: number
  totalSteps: number
}) {
  const tone = readiness.readyToFinalize ? "ok" : readiness.readyToEnter ? "brass" : "warn"
  const label = readiness.readyToFinalize
    ? "Ready to finalize — every field is in and every required upload is accepted."
    : readiness.readyToEnter
      ? "Ready to enter — start transcribing. A few uploads are still outstanding before you can finalize."
      : "Not ready to enter — chase the items below before starting the portal."

  return (
    <div className="space-y-3 rounded-lg border border-hairline bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">NYPD portal — {applicant}</h2>
          <p className="mt-0.5 text-sm text-text-mid">
            Transcribe these into the portal in order. Same screens, same headings. · <span className="text-text-low">{enteredCount}/{totalSteps} steps entered</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ssnConfigured && <SsnReveal caseId={caseId} revealSsn={revealSsn} />}
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-mid hover:bg-surface-3 hover:text-foreground"
          >
            <ExternalLink className="size-3.5" /> Open portal
          </a>
          <a
            href={recordHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-mid hover:bg-surface-3 hover:text-foreground"
          >
            <FileText className="size-3.5" /> Application record (PDF)
          </a>
          <a
            href={uploadSetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-mid hover:bg-surface-3 hover:text-foreground"
          >
            <FileArchive className="size-3.5" /> Upload set (ZIP)
          </a>
        </div>
      </div>

      <div
        className={
          tone === "ok"
            ? "rounded-md border border-ok/40 bg-ok/10 p-3 text-sm text-ok"
            : tone === "brass"
              ? "rounded-md border border-brass/40 bg-brass/10 p-3 text-sm text-brass"
              : "rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn"
        }
      >
        <strong>{label}</strong>
        {!readiness.readyToEnter && readiness.enterMissing.length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {readiness.enterMissing.map((m, i) => (
              <li key={i}>{m.label}</li>
            ))}
          </ul>
        )}
        {readiness.readyToEnter && !readiness.readyToFinalize && readiness.finalizeMissing.length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {readiness.finalizeMissing.map((m, i) => (
              <li key={i}>{m.label} — not yet accepted</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SsnReveal({ caseId, revealSsn }: { caseId: string; revealSsn: (caseId: string) => Promise<{ ssn?: string; error?: string }> }) {
  const [ssn, setSsn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const { copied, copy } = useCopy()

  if (ssn) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-brass/40 bg-brass/10 px-2.5 py-1.5 text-xs">
        <span className="font-mono font-medium text-foreground">{ssn}</span>
        <button type="button" onClick={() => copy("ssn", ssn)} className="text-text-low hover:text-foreground" aria-label="Copy SSN">
          {copied === "ssn" ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        </button>
        <button type="button" onClick={() => setSsn(null)} className="text-text-low hover:text-foreground" aria-label="Hide SSN">
          <EyeOff className="size-3.5" />
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setError(null)
          const r = await revealSsn(caseId)
          if (r.ssn) setSsn(r.ssn)
          else setError(r.error ?? "Could not reveal SSN")
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-mid hover:bg-surface-3 hover:text-foreground disabled:opacity-60"
      title={error ?? "Decrypts and logs the access"}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
      {error ? <span className="text-danger">{error}</span> : "Reveal SSN"}
    </button>
  )
}

/* ─────────────────────────── step rail ─────────────────────────── */

function railTone(section: WorksheetSection, slots: PortalSlotView[]): "ok" | "warn" | "danger" | "neutral" {
  if (section.kind === "uploads") {
    const active = slots
    if (active.some((s) => s.state === "rejected")) return "danger"
    if (active.some((s) => s.starred && s.state !== "accepted")) return "warn"
    if (active.length > 0 && active.every((s) => s.state === "accepted")) return "ok"
    return "warn"
  }
  if (section.kind === "checkpoint") return "neutral"
  return section.fields.some((f) => f.missing) ? "warn" : "ok"
}

function StepRail({ sections, slots, entered }: { sections: WorksheetSection[]; slots: PortalSlotView[]; entered: Set<number> }) {
  return (
    <nav className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 rounded-lg border border-hairline bg-card/95 p-2 backdrop-blur">
      {sections.map((section) => {
        const tone = railTone(section, slots)
        const dot =
          tone === "ok"
            ? "bg-ok"
            : tone === "warn"
              ? "bg-warn"
              : tone === "danger"
                ? "bg-danger"
                : "bg-text-low/40"
        const isEntered = entered.has(section.no)
        return (
          <a
            key={section.no}
            href={`#step-${section.no}`}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-surface-3 hover:text-foreground ${
              isEntered ? "border-ok/40 bg-ok/10 text-ok" : "border-hairline text-text-mid"
            }`}
            title={`Step ${section.no} — ${section.title}${isEntered ? " (entered)" : ""}`}
          >
            {isEntered ? <CheckSquare className="size-3" /> : <span className={`size-1.5 rounded-full ${dot}`} />}
            <span className="font-medium">{section.no}</span>
          </a>
        )
      })}
    </nav>
  )
}

/* ─────────────────────────── step 13 — documents ─────────────────────────── */

const STATE_META: Record<SlotState, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  accepted: { label: "Accepted", cls: "text-ok", Icon: CircleCheck },
  submitted: { label: "Uploaded — awaiting review", cls: "text-brass", Icon: CircleDashed },
  rejected: { label: "Sent back", cls: "text-danger", Icon: CircleX },
  missing: { label: "Not uploaded", cls: "text-warn", Icon: CircleDashed },
}

function DocumentsStep({
  section,
  slots,
  heldForInterview,
  openDocument,
  headerRight,
}: {
  section: WorksheetSection
  slots: PortalSlotView[]
  heldForInterview: ApplicationTabData["heldForInterview"]
  openDocument: (documentId: string) => Promise<{ url?: string; error?: string }>
  headerRight?: ReactNode
}) {
  return (
    <section id={`step-${section.no}`} className="scroll-mt-4 space-y-3 rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            <span className="mr-2 text-text-low">Step {section.no}</span>
            {section.title}
          </h3>
          <p className="mt-0.5 text-xs text-text-mid">
            Upload each of these into the portal&apos;s matching slot. Preview a file before you attach it — open it here first.
          </p>
        </div>
        {headerRight}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-text-mid">This application has no portal uploads.</p>
      ) : (
        <div className="divide-y divide-hairline rounded-md border border-hairline">
          {slots.map((slot) => (
            <SlotRow key={slot.reqCode} slot={slot} openDocument={openDocument} />
          ))}
        </div>
      )}

      {heldForInterview.length > 0 && (
        <div className="rounded-md border border-hairline bg-surface-2/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
            <Lock className="size-3.5" /> Held for the interview — do NOT upload these to the portal
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-low">
            {heldForInterview.map((h) => (
              <li key={h.reqCode}>· {h.title}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SlotRow({ slot, openDocument }: { slot: PortalSlotView; openDocument: (documentId: string) => Promise<{ url?: string; error?: string }> }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const meta = STATE_META[slot.state]
  // Pre-flight: the portal rejects a PDF in the image-only Photograph slot. Catch it
  // here so a staffer doesn't get bounced mid-entry.
  const imageOnlyViolation = slot.imageOnly && /\.pdf$/i.test(slot.fileName ?? "")

  const open = () => {
    if (!slot.documentId) return
    start(async () => {
      setError(null)
      const r = await openDocument(slot.documentId!)
      if (r.url) window.open(r.url, "_blank", "noopener,noreferrer")
      else setError(r.error ?? "Could not open")
    })
  }

  return (
    <div className={`flex items-start justify-between gap-3 px-3 py-2.5 ${slot.state === "rejected" ? "bg-danger/5" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {slot.portalLabel}
          {slot.starred && <span className="text-danger" title="Portal-required">*</span>}
          {slot.imageOnly && <span className="rounded bg-surface-3 px-1 py-0.5 text-[10px] font-normal text-text-low">image only — no PDF</span>}
        </div>
        <div className={`mt-0.5 inline-flex items-center gap-1 text-xs ${meta.cls}`}>
          <meta.Icon className="size-3.5" /> {meta.label}
        </div>
        {slot.fileName && <div className="mt-0.5 truncate text-xs text-text-low">{slot.fileName}</div>}
        {imageOnlyViolation && (
          <div className="mt-0.5 text-xs font-medium text-danger">This slot is image-only — the portal will reject this PDF. Get a photo (JPG/PNG) instead.</div>
        )}
        {slot.sharedFromLabel && <div className="mt-0.5 text-xs text-text-low">Provided from another upload</div>}
        {slot.rejectionNote && <div className="mt-0.5 text-xs text-danger">Note: {slot.rejectionNote}</div>}
        {error && <div className="mt-0.5 text-xs text-danger">{error}</div>}
      </div>
      {slot.documentId && (
        <button
          type="button"
          disabled={pending}
          onClick={open}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs text-text-mid hover:bg-surface-3 hover:text-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
          View
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────── checkpoints (15/16/17) ─────────────────────────── */

function CheckpointCard({ section, headerRight }: { section: WorksheetSection; headerRight?: ReactNode }) {
  const irreversible = section.no === 16
  return (
    <section id={`step-${section.no}`} className="scroll-mt-4 rounded-lg border border-hairline bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-text-low">Step {section.no}</span>
          {section.title}
          {irreversible && (
            <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">
              <ShieldAlert className="size-3.5" /> irreversible
            </span>
          )}
        </h3>
        {headerRight}
      </div>
      <p className="px-4 py-3 text-sm text-text-mid">{section.note}</p>
    </section>
  )
}
