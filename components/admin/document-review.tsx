"use client"

import { useState, useTransition } from "react"
import { ExternalLink, Check, X } from "lucide-react"
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
  const [note, setNote] = useState("")

  function approve(doc: DocRow) {
    startTransition(async () => {
      try {
        await reviewDocument({ documentId: doc.id, caseId, clientId, status: "approved" })
        toast.success(`Approved ${doc.type.replace(/_/g, " ")}`)
      } catch {
        toast.error("Couldn't approve. Try again.")
      }
    })
  }

  function confirmReject() {
    if (!rejecting) return
    const doc = rejecting
    startTransition(async () => {
      try {
        await reviewDocument({
          documentId: doc.id,
          caseId,
          clientId,
          status: "rejected",
          notes: note,
        })
        toast.success("Marked needs-fix; client notified.")
        setRejecting(null)
        setNote("")
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
      <ul className="divide-y rounded-lg border bg-card">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {doc.type.replace(/_/g, " ")}
                </span>
                <StatusBadge status={doc.status} />
                {doc.notarized && (
                  <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
                    notarized
                  </span>
                )}
                {doc.generated && !doc.signed_at && (
                  // An unsigned draft must never be reviewed as if it were the
                  // filed article — the applicant hasn't signed it yet.
                  <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
                    draft — unsigned
                  </span>
                )}
                <span className="text-xs text-muted-foreground">v{doc.version}</span>
              </div>
              {doc.review_notes && (
                <p className="mt-0.5 text-xs text-muted-foreground">Note: {doc.review_notes}</p>
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
            <Button
              size="sm"
              variant="outline"
              disabled={pending || doc.status === "approved"}
              onClick={() => approve(doc)}
              className="text-ok"
            >
              <Check className="size-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setRejecting(doc)
                setNote(doc.review_notes ?? "")
              }}
              className="text-destructive"
            >
              <X className="size-4" /> Needs fix
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a fix</DialogTitle>
            <DialogDescription>
              Tell the client what to correct. They&apos;ll be notified and can re-upload.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Please retake the open-door photo so the full interior is visible."
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={pending}>
              Send & mark needs-fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
