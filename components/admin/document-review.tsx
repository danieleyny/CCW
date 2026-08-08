"use client"

import { useMemo, useState, useTransition } from "react"
import { ExternalLink, Check, X, Link2 } from "lucide-react"
import { toast } from "sonner"
import { reviewDocument } from "@/app/admin/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface DocRow {
  id: string
  type: string
  status: string
  notarized: boolean
  version: number
  review_notes: string | null
  file_name: string | null
  signedUrl: string | null
  /** Generated on platform (vs uploaded by the client). */
  generated: boolean
  /** ISO signing timestamp; null on a generated document means unsigned DRAFT. */
  signed_at: string | null
  /** ISO upload timestamp. */
  created_at: string | null
  // ── Requirement context (from the registry; never duplicated in this file) ──
  /** The requirement this upload answers, e.g. "IDN-02". Null when unmatched. */
  reqCode: string | null
  /** Human requirement name, e.g. "Proof of address". */
  reqTitle: string | null
  /** "What makes it acceptable" — the registry's own description. May be empty. */
  acceptance: string | null
  /** Whether the requirement blocks filing. */
  reqBlocking: boolean
  /** The case_requirement's status (satisfied / pending / …). */
  reqStatus: string | null
  /** Titles of OTHER requirements this exact upload also satisfies. */
  sameFileAs: string[]
}

/** Canned rejection reasons — a picklist beats free-text guesswork and keeps the
 *  reason consistent for the client. "Other" falls back to the detail field. */
const REJECT_REASONS = [
  "Blurry or unreadable",
  "Wrong document for this requirement",
  "Expired or out of date",
  "Not notarized",
  "Signed before it was notarized",
  "Missing a page or detail",
  "Other",
] as const

// Pending first (needs action), then rejected (awaiting re-upload), then approved.
const STATUS_ORDER: Record<string, number> = { pending: 0, rejected: 1, approved: 2 }
const UNMATCHED = "__unmatched__"

/**
 * A document is reviewable only when it's actually been submitted for review:
 * still `pending` (not already approved/rejected) AND not an unsigned draft.
 */
function reviewable(doc: DocRow): boolean {
  if (doc.status !== "pending") return false
  if (doc.generated && !doc.signed_at) return false
  return true
}

function humanizeType(t: string): string {
  return t.replace(/_/g, " ")
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Coarse, join-free "who sent it" hint from the document's own shape. */
function uploaderLabel(doc: DocRow): string {
  if (doc.generated) return "Prepared for the applicant"
  if (doc.type === "reference_letter") return "Uploaded by the reference"
  if (doc.type === "cohabitant_affidavit") return "Uploaded by a household member"
  return "Uploaded by the applicant"
}

interface Group {
  key: string
  reqCode: string | null
  title: string | null
  acceptance: string | null
  blocking: boolean
  reqStatus: string | null
  docs: DocRow[]
}

export function DocumentReview({
  caseId,
  clientId,
  documents,
}: {
  caseId: string
  clientId: string
  documents: DocRow[]
}) {
  const [pending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState<DocRow | null>(null)
  const [reason, setReason] = useState<string>("")
  const [detail, setDetail] = useState("")

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const d of documents) {
      const key = d.reqCode ?? UNMATCHED
      let g = map.get(key)
      if (!g) {
        g = {
          key,
          reqCode: d.reqCode,
          title: d.reqTitle,
          acceptance: d.acceptance,
          blocking: d.reqBlocking,
          reqStatus: d.reqStatus,
          docs: [],
        }
        map.set(key, g)
      }
      g.docs.push(d)
    }
    const arr = [...map.values()]
    for (const g of arr) {
      g.docs.sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.version - a.version
      )
    }
    // Groups with something pending float up; the "unmatched" bucket sinks last.
    arr.sort((a, b) => {
      if (a.key === UNMATCHED) return 1
      if (b.key === UNMATCHED) return -1
      const ap = a.docs.some((d) => d.status === "pending") ? 0 : 1
      const bp = b.docs.some((d) => d.status === "pending") ? 0 : 1
      return ap - bp || (a.title ?? a.reqCode ?? "").localeCompare(b.title ?? b.reqCode ?? "")
    })
    return arr
  }, [documents])

  function approve(doc: DocRow) {
    startTransition(async () => {
      try {
        await reviewDocument({ documentId: doc.id, caseId, clientId, status: "approved" })
        toast.success(`Approved — ${doc.reqTitle ?? humanizeType(doc.type)}`)
      } catch {
        toast.error("Couldn't approve. Try again.")
      }
    })
  }

  function openReject(doc: DocRow) {
    setRejecting(doc)
    // Seed from the prior note so an edit doesn't silently wipe it.
    setReason("")
    setDetail(doc.review_notes ?? "")
  }

  function confirmReject() {
    if (!rejecting) return
    const trimmed = detail.trim()
    const notes = reason === "Other" ? trimmed : trimmed ? `${reason} — ${trimmed}` : reason
    if (!notes) {
      toast.error(reason === "Other" ? "Add a short explanation." : "Pick a reason.")
      return
    }
    const doc = rejecting
    startTransition(async () => {
      try {
        await reviewDocument({ documentId: doc.id, caseId, clientId, status: "rejected", notes })
        toast.success("Marked needs-fix; client notified.")
        setRejecting(null)
        setReason("")
        setDetail("")
      } catch {
        toast.error("Couldn't update. Try again.")
      }
    })
  }

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No documents uploaded yet.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((g) => {
          const received = g.docs.length
          return (
            <section key={g.key} className="overflow-hidden rounded-lg border bg-card">
              {/* Requirement header — the label + code lead, largest. */}
              <div className="border-b bg-surface-2/40 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {g.reqCode ? (
                    <span className="rounded bg-brass/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brass-bright">
                      {g.reqCode}
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold">
                    {g.title ?? (g.key === UNMATCHED ? "Unmatched uploads" : "Requirement")}
                  </span>
                  {g.blocking && (
                    <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                      blocking
                    </span>
                  )}
                  {g.reqStatus && <StatusBadge status={g.reqStatus} />}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {received} {received === 1 ? "file" : "files"} received
                  </span>
                </div>
                {g.key === UNMATCHED ? (
                  <p className="mt-1 text-xs text-text-low">
                    These uploads aren&apos;t tied to a requirement — confirm what they are before acting.
                  </p>
                ) : g.acceptance ? (
                  <p className="mt-1 text-xs text-text-low">
                    <span className="font-medium text-muted-foreground">Accept when:</span> {g.acceptance}
                  </p>
                ) : null}
              </div>

              {/* Uploads for this requirement. */}
              <ul className="divide-y">
                {g.docs.map((doc) => {
                  const when = fmtDate(doc.created_at)
                  return (
                    <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={doc.status} />
                          {doc.notarized && (
                            <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
                              notarized
                            </span>
                          )}
                          {doc.generated && !doc.signed_at && (
                            <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
                              draft — unsigned
                            </span>
                          )}
                          {doc.version > 1 && (
                            <span className="text-xs text-muted-foreground">v{doc.version}</span>
                          )}
                          {doc.sameFileAs.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-low">
                              <Link2 className="size-3" /> Same file as {doc.sameFileAs.join(", ")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-text-low">
                          {uploaderLabel(doc)}
                          {when ? ` · ${when}` : ""}
                          {doc.file_name ? (
                            <>
                              {" · "}
                              <span className="font-mono text-[11px] text-muted-foreground">{doc.file_name}</span>
                            </>
                          ) : null}
                        </p>
                        {doc.review_notes && doc.status === "rejected" && (
                          <p className="mt-1 text-xs text-danger">Sent back: {doc.review_notes}</p>
                        )}
                      </div>

                      {doc.signedUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={doc.signedUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" /> View
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">no file</span>
                      )}

                      {reviewable(doc) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => approve(doc)}
                            className="text-ok"
                          >
                            <Check className="size-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => openReject(doc)}
                            className="text-destructive"
                          >
                            <X className="size-4" /> Needs fix
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {doc.status === "approved"
                            ? "reviewed"
                            : doc.status === "rejected"
                              ? "sent back"
                              : "awaiting signature"}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a fix</DialogTitle>
            <DialogDescription>
              {rejecting?.reqTitle
                ? `Why does "${rejecting.reqTitle}" need redoing? The client is notified and can re-upload.`
                : "Tell the client what to correct. They'll be notified and can re-upload."}
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-1.5">
            {REJECT_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-surface-2/60 has-[:checked]:border-brass has-[:checked]:bg-brass/10"
              >
                <input
                  type="radio"
                  name="reject-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="size-4"
                />
                {r}
              </label>
            ))}
          </fieldset>

          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              reason === "Other"
                ? "Explain what the client needs to fix."
                : "Optional detail — e.g. retake the photo so the full interior is visible."
            }
            rows={3}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={pending}>
              Send &amp; mark needs-fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
