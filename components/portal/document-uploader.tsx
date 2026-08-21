"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, ExternalLink, Loader2, CheckCircle2, ChevronDown, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { recordDocument } from "@/app/portal/actions"
import { validateFile } from "@/lib/files/validator"
import { compressImageFile } from "@/lib/files/compress"
import { normalizeApplicantPhoto } from "@/lib/files/photo-spec"
import { StatusBadge } from "@/components/shared/status-badge"
import { DocumentExample } from "@/components/portal/document-example"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DocumentType } from "@/lib/doc-types"
import type { SmartDocument } from "@/lib/requirements/smart-documents"

export interface CurrentDoc {
  status: string
  review_notes: string | null
  version: number
  signedUrl: string | null
  /**
   * Smart documents: set when this requirement is answered by a file the
   * applicant uploaded for a DIFFERENT requirement (a passport uploaded for
   * photo ID that also covers this date-of-birth item). Names that file so we
   * show "provided from …" instead of asking for the same document again.
   */
  sharedFromName?: string | null
}

export function DocumentUploader({
  caseId,
  clientId,
  type,
  reqCode,
  label,
  description,
  current,
  photoSpec = false,
  smartKinds,
  conciergeVoice = false,
  guide = null,
}: {
  caseId: string
  clientId: string
  type: DocumentType
  /** Which requirement this upload answers — IDN-01/02/03 all share one
   *  document type, so type alone can't say which item was just satisfied. */
  reqCode?: string
  label: string
  description?: string
  current: CurrentDoc | null
  /** V3-P4.2 — validate against the NYPD photo spec (square, 600–1200px). */
  photoSpec?: boolean
  /** Smart documents: kinds this requirement can be answered by. When present,
   *  the applicant picks what the file IS, and it's attached to every requirement
   *  that kind covers (a passport → photo ID + DOB + citizenship, uploaded once). */
  smartKinds?: SmartDocument[]
  /** CONCIERGE QA Phase 9 — warm done-for-you voice: a pending upload reads
   *  "Got it — we're checking this", not a raw PENDING chip. */
  conciergeVoice?: boolean
  /** CONCIERGE UX 2.1 — the registry's how-to, shown as a collapsible in the card. */
  guide?: {
    steps: string[]
    sourceUrl: string
    sourceLabel?: string
    example?: string
    multiple?: boolean
  } | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const hasSmart = !!smartKinds && smartKinds.length > 0
  const [kind, setKind] = useState<string>(hasSmart ? smartKinds![0].kind : "")
  const selectedKind = hasSmart ? smartKinds!.find((k) => k.kind === kind) : undefined

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return

    if (photoSpec) {
      // V3-P4.2 — the NYPD photo spec, enforced mechanically: square photos
      // that are merely oversized get auto-downscaled to 1200×1200; anything
      // unfixable is rejected with the exact reason.
      const spec = await normalizeApplicantPhoto(file)
      if (!spec.ok || !spec.file) {
        toast.error(spec.issues[0] ?? "That photo doesn't meet the NYPD spec.", { duration: 9000 })
        return
      }
      file = spec.file
      if ((spec.width ?? 0) > 1200) toast.info("Photo auto-resized to the NYPD 1200×1200 maximum.")
    } else {
      // V3-P0.5 — downscale/re-encode phone photos (incl. HEIC→JPEG) before the
      // size check, so a 12 MB safe photo becomes a compliant ~2 MB JPEG.
      file = await compressImageFile(file)
    }

    // FMT-01: enforce size + type and sanitize the filename (the NYPD portal
    // silently rejects oversized files, wrong types, and "dirty" names).
    const check = validateFile({ name: file.name, size: file.size })
    if (!check.ok) {
      toast.error(check.errors[0] ?? "That file can't be uploaded.")
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const documentId = crypto.randomUUID()
      const path = `clients/${clientId}/${documentId}/${check.sanitizedName}`

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true })
      if (upErr) throw upErr

      // When a smart-document kind is chosen, the file's stored type follows the
      // kind (so a passport tagged under a residence item can't mis-store), and
      // documentKind drives the multi-attach on the server.
      const uploadType = selectedKind ? selectedKind.documentType : type
      await recordDocument({
        documentId,
        caseId,
        type: uploadType,
        reqCode,
        documentKind: selectedKind?.kind,
        path,
        fileName: check.sanitizedName,
      })
      toast.success(`Uploaded — ${label} is now pending review.`)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Upload failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const needsFix = current?.status === "rejected"
  // Smart documents: this requirement is already covered by a file uploaded for
  // another requirement. Show that, with a link — not an empty "upload it again".
  const sharedProvided = !!current?.sharedFromName && !needsFix

  // UX 2.4 — three visual states in the concierge vault. RECEIVED is a distinct,
  // obviously-positive BRASS state (never green — green means a human approved it).
  const approved = current?.status === "approved"
  const received = !!current && current.status === "pending"
  const stateClass = conciergeVoice
    ? approved
      ? "border-ok/50 bg-gradient-to-br from-ok/10 to-transparent ring-1 ring-ok/15"
      : received
        ? "border-brass/50 bg-gradient-to-br from-brass/10 to-transparent ring-1 ring-brass/15"
        : "border-hairline bg-card"
    : "border bg-card"

  return (
    <div className={cn("rounded-lg p-4 transition-colors", stateClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {current ? (
          conciergeVoice && approved ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ok">
              <CheckCircle2 className="size-3.5" /> Approved
            </span>
          ) : conciergeVoice && received ? (
            <span className="whitespace-nowrap text-xs font-medium text-brass-bright">Received — we&apos;re checking this</span>
          ) : (
            <StatusBadge status={current.status} />
          )
        ) : (
          <span className="text-xs text-muted-foreground">Not uploaded</span>
        )}
      </div>

      {needsFix && current?.review_notes && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          Needs a fix: {current.review_notes}
        </p>
      )}

      {sharedProvided && (
        <div className="mt-3 rounded-md border border-ok/25 bg-ok/8 p-2.5">
          <p className="text-xs text-ok">
            Provided from <span className="font-medium">{current!.sharedFromName}</span> — the
            document you already uploaded also covers this. No need to send it again.
          </p>
        </div>
      )}

      {hasSmart && !sharedProvided && (
        <div className="mt-3 space-y-1.5">
          <label htmlFor={`kind-${reqCode}`} className="text-[13px] text-muted-foreground sm:text-xs">
            What is this document?
          </label>
          <select
            id={`kind-${reqCode}`}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={busy}
            className="h-[var(--tap)] w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40 sm:h-10 sm:text-sm"
          >
            {smartKinds!.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
          {selectedKind && selectedKind.reqCodes.length > 1 && (
            <p className="rounded-md border border-ok/25 bg-ok/8 p-2 text-[11px] text-ok">
              One {selectedKind.label} covers your {selectedKind.covers} — upload it
              once and we&apos;ll attach it to each of those, no need to send it again.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
        <Button
          size="sm"
          variant={sharedProvided ? "ghost" : current ? "outline" : "default"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {sharedProvided ? "Upload a different file" : current ? (needsFix ? "Re-upload" : "Replace") : "Upload"}
        </Button>
        {current?.signedUrl && (
          <Button asChild size="sm" variant="ghost">
            <a href={current.signedUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View
            </a>
          </Button>
        )}
        {current && !sharedProvided && <span className="text-xs text-muted-foreground">v{current.version}</span>}
      </div>

      {/* UX 2.1 — the registry's how-to, collapsed by default so the vault stays short */}
      {guide && guide.steps.length > 0 && (
        <details className="group mt-3 border-t border-hairline pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-signal">
            <HelpCircle className="size-3.5" /> How to get this
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs text-text-mid">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-[10px] text-text-low">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {guide.example && (
            <div className="mt-3 max-w-[220px]">
              <DocumentExample id={guide.example as never} />
            </div>
          )}
          <a
            href={guide.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-signal transition-colors hover:bg-surface-2"
          >
            {guide.sourceLabel ?? "Official source"} <ExternalLink className="size-3" />
          </a>
        </details>
      )}
    </div>
  )
}
