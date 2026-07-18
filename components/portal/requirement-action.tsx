"use client"

import { useState, useTransition } from "react"
import { ChevronDown, Download, ExternalLink, FileText, Check, Stamp, PenLine } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase/types"
import { actionFor, isSignable } from "@/lib/requirements/actions"
import { questionnaireFor } from "@/lib/requirements/questionnaires"
import { confirmAttestation, generateCompanionDocument } from "@/app/portal/requirements/actions"
import { QuestionnaireDialog } from "@/components/portal/questionnaire-dialog"
import { SignDocument } from "@/components/portal/sign-document"
import { DocumentExample } from "@/components/portal/document-example"
import { DocumentUploader } from "@/components/portal/document-uploader"
import { Button } from "@/components/ui/button"

type DocumentType = Database["public"]["Enums"]["document_type"]

export interface GeneratedDoc {
  id: string
  fileName: string | null
  url: string | null
  /** ISO timestamp, or null while it's still an unsigned DRAFT. */
  signedAt: string | null
}

/**
 * The right inline action for a requirement — replacing the bare "Upload"
 * button that used to sit on every row regardless of what the item actually
 * needs. generate → questionnaire drawer; obtain → how-to + official link +
 * inline uploader; attest → a confirm.
 */
export function RequirementAction({
  reqCode,
  status,
  caseId,
  clientId,
  prefill,
  generated,
  signatureOnFile,
}: {
  reqCode: string
  status: string
  caseId: string
  clientId: string
  prefill: Record<string, unknown>
  generated?: GeneratedDoc | null
  /** Base64 PNG of the signature already on file for this case, if any. */
  signatureOnFile: string | null
}) {
  const [open, setOpen] = useState(false)
  const [signing, setSigning] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const [pending, startTransition] = useTransition()

  const action = actionFor(reqCode)
  if (!action || status === "na") return null
  const done = status === "satisfied"

  // ── generate ──────────────────────────────────────────────────────────────
  if (action.mode === "generate") {
    const q = questionnaireFor(action.questionnaireId ?? "")
    // A generated document is a DRAFT until it's signed. Say so plainly, and
    // make signing — not downloading — the obvious next move.
    const needsSignature = isSignable(action) && !!generated && !generated.signedAt
    return (
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {q && (
            <Button
              size="sm"
              variant={done || needsSignature ? "outline" : "default"}
              onClick={() => setOpen(true)}
            >
              <FileText className="mr-1.5 size-3.5" />
              {generated ? "Edit & regenerate" : action.actionLabel}
            </Button>
          )}
          {needsSignature && !signing && (
            <Button size="sm" onClick={() => setSigning(true)}>
              <PenLine className="mr-1.5 size-3.5" /> Review &amp; sign
            </Button>
          )}
          {generated?.url && (
            <Button size="sm" variant="outline" asChild>
              <a href={generated.url} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 size-3.5" />
                {generated.signedAt ? "Download" : "Read the draft"}
              </a>
            </Button>
          )}
          {action.companion && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await generateCompanionDocument(reqCode)
                  toast[r.error ? "error" : "success"](r.error ?? "Request letter ready in Documents.")
                })
              }
            >
              {action.companion.label}
            </Button>
          )}
        </div>

        {needsSignature && (
          <p className="flex items-start gap-1.5 rounded-md border border-brass/30 bg-brass/10 p-2 text-xs text-brass">
            <PenLine className="mt-0.5 size-3.5 shrink-0" />
            Draft — unsigned. It doesn&apos;t count toward your application until you sign it, and
            the date on it will be the date you sign.
          </p>
        )}

        {needsSignature && signing && (
          <SignDocument
            reqCode={reqCode}
            signatureOnFile={signatureOnFile}
            onSigned={() => setSigning(false)}
          />
        )}

        {action.notarize && generated && !done && (
          <p className="flex items-start gap-1.5 rounded-md border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
            <Stamp className="mt-0.5 size-3.5 shrink-0" />
            Generated — now have it notarized and upload the signed copy. This item stays open until
            the notarized copy is in.
          </p>
        )}

        {action.example && <DocumentExample id={action.example} />}

        {action.notarize && generated && !done && action.documentType && (
          <DocumentUploader
            caseId={caseId}
            clientId={clientId}
            type={action.documentType as DocumentType}
            reqCode={reqCode}
            label="Upload the notarized copy"
            current={null}
          />
        )}

        {q && (
          <QuestionnaireDialog
            open={open}
            onOpenChange={setOpen}
            reqCode={reqCode}
            questionnaire={q}
            initial={prefill}
            signatureOnFile={signatureOnFile}
          />
        )}
      </div>
    )
  }

  // ── obtain ────────────────────────────────────────────────────────────────
  if (action.mode === "obtain") {
    return (
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => setHowTo((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-signal transition-colors hover:text-foreground"
          aria-expanded={howTo}
        >
          <ChevronDown className={`size-4 transition-transform ${howTo ? "rotate-180" : ""}`} />
          How to get this
        </button>

        {howTo && (
          <div className="rounded-md border border-hairline bg-surface-2/40 p-3">
            <ol className="ml-4 list-decimal space-y-1.5 text-sm text-text-mid">
              {(action.steps ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {action.sourceUrl && (
              <a
                href={action.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-signal underline"
              >
                {action.sourceLabel ?? "Official source"} <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}

        {action.example && <DocumentExample id={action.example} />}

        {!done && action.documentType && (
          <DocumentUploader
            caseId={caseId}
            clientId={clientId}
            type={action.documentType as DocumentType}
            reqCode={reqCode}
            label={action.actionLabel}
            current={null}
            photoSpec={reqCode === "IDN-04"}
          />
        )}
      </div>
    )
  }

  // ── attest ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-3">
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ok">
          <Check className="size-3.5" /> Confirmed
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await confirmAttestation(reqCode)
              toast[r.error ? "error" : "success"](r.error ?? "Confirmed.")
            })
          }
        >
          {action.actionLabel}
        </Button>
      )}
    </div>
  )
}
