"use client"

import { useState, useTransition } from "react"
import { Check, FileText, MessageSquareWarning, ExternalLink, Users, Lock } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { reviewRequirement, trainerDocumentUrl, bulkReviewRequirements } from "@/app/instructor/cases/review-actions"
import { cn } from "@/lib/utils"

export interface ReviewItem {
  caseRequirementId: string
  reqCode: string
  title: string
  status: string
  blocking: boolean
  scope: "progress" | "full"
  documentId: string | null
  documentName: string | null
  /** Counts for the third-party items — never the people behind them. */
  progress?: { done: number; required: number | null } | null
  /** The trainer's own last decision on this item. */
  lastReview?: { decision: string; note: string | null; at: string } | null
}

/**
 * The trainer's review surface.
 *
 * SCOPE IS THE POINT: `full` items get approve / request-changes. `progress`
 * items — cohabitant affidavits, reference letters — show counts only, because
 * they're written and notarized by people who never signed up for this. Nothing
 * disclosure-related appears at all; it isn't rendered as a locked row, because
 * a row labelled "ARR-01" would itself say the applicant has an arrest history.
 *
 * The vocabulary is deliberate: "Looks complete" and "Ask for a fix", never
 * "approved as legally sufficient". A trainer checks that paperwork is complete
 * and correct. What a disclosure MEANS is a legal question, and it stays with
 * Gun License NYC and the attorney seam.
 */
export function TrainerRequirementReview({ items }: { items: ReviewItem[] }) {
  const router = useRouter()
  const full = items.filter((i) => i.scope === "full")
  const progress = items.filter((i) => i.scope === "progress")

  const needsReview = full.filter((i) => i.documentId && i.status !== "satisfied")
  const reviewableIds = new Set(needsReview.map((i) => i.caseRequirementId))

  // Bulk selection — only over items that actually have evidence to review, so
  // a bulk-approve can never hit an item the RPC would reject for want of a doc.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAsking, setBulkAsking] = useState(false)
  const [bulkNote, setBulkNote] = useState("")
  const [bulkPending, startBulk] = useTransition()
  const selectedList = [...selected].filter((id) => reviewableIds.has(id))

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  function runBulk(decision: "approved" | "changes_requested", note?: string) {
    startBulk(async () => {
      const res = await bulkReviewRequirements(selectedList, decision, note)
      if (res.ok > 0) {
        toast.success(
          decision === "approved"
            ? `Marked ${res.ok} item${res.ok === 1 ? "" : "s"} complete.`
            : `Sent ${res.ok} item${res.ok === 1 ? "" : "s"} back.`
        )
      }
      if (res.failed > 0) toast.error(`${res.failed} couldn't be updated`, { description: res.errors[0] })
      setSelected(new Set())
      setBulkAsking(false)
      setBulkNote("")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {needsReview.length > 0 && (
        <p className="rounded-md border border-brass/30 bg-brass/8 px-3 py-2 text-xs text-brass-bright">
          {needsReview.length} item{needsReview.length === 1 ? "" : "s"} waiting on your review.
        </p>
      )}

      {/* Bulk bar — only worth showing when there's more than one to act on. */}
      {needsReview.length > 1 && (
        <div className="rounded-md border bg-surface-2/40 p-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                setSelected(() => (selectedList.length === needsReview.length ? new Set() : new Set(reviewableIds)))
              }
              className="rounded border border-hairline px-2 py-1 text-text-mid hover:text-foreground"
            >
              {selectedList.length === needsReview.length ? "Clear" : "Select all"}
            </button>
            <span className="text-text-low">{selectedList.length} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" disabled={bulkPending || selectedList.length === 0} onClick={() => runBulk("approved")}>
                <Check className="mr-1 size-3.5" /> Approve selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkPending || selectedList.length === 0}
                onClick={() => setBulkAsking((v) => !v)}
              >
                <MessageSquareWarning className="mr-1 size-3.5" /> Request changes
              </Button>
            </div>
          </div>
          {bulkAsking && (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={2}
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="One note sent with every selected item — e.g. please re-upload clearer scans"
                className="text-sm"
              />
              <Button
                size="sm"
                disabled={bulkPending || !bulkNote.trim() || selectedList.length === 0}
                onClick={() => runBulk("changes_requested", bulkNote)}
              >
                Send {selectedList.length} back
              </Button>
            </div>
          )}
        </div>
      )}

      <ul className="divide-y rounded-lg border bg-card">
        {full.map((item) => (
          <ReviewRow
            key={item.caseRequirementId}
            item={item}
            selectable={reviewableIds.has(item.caseRequirementId)}
            selected={selected.has(item.caseRequirementId)}
            onToggle={() => toggle(item.caseRequirementId)}
          />
        ))}
        {full.length === 0 && (
          <li className="p-4 text-sm text-text-mid">Nothing to review yet.</li>
        )}
      </ul>

      {progress.length > 0 && (
        <div>
          <h3 className="engraved mb-2 flex items-center gap-2 text-text-low">
            <Users className="size-3.5" /> People they still need
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {progress.map((item) => (
              <li key={item.caseRequirementId} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-sm">{item.title}</div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-low">
                    <Lock className="size-3" />
                    {item.progress
                      ? `${item.progress.done} of ${item.progress.required ?? "—"} notarized`
                      : "Waiting on the applicant"}
                    {" · the documents themselves stay with Gun License NYC"}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ReviewRow({
  item,
  selectable = false,
  selected = false,
  onToggle,
}: {
  item: ReviewItem
  selectable?: boolean
  selected?: boolean
  onToggle?: () => void
}) {
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  const done = item.status === "satisfied"
  const awaiting = !!item.documentId && !done

  function decide(decision: "approved" | "changes_requested") {
    startTransition(async () => {
      const r = await reviewRequirement(item.caseRequirementId, decision, note || undefined)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setAsking(false)
      setNote("")
      toast.success(
        decision === "approved"
          ? "Marked complete — the applicant can see you checked it."
          : "Sent back with your note."
      )
    })
  }

  function openDocument() {
    startTransition(async () => {
      if (!item.documentId) return
      const r = await trainerDocumentUrl(item.documentId)
      if (r.error || !r.url) {
        toast.error(r.error ?? "Couldn't open that file.")
        return
      }
      window.open(r.url, "_blank", "noreferrer")
    })
  }

  return (
    <li className={cn("space-y-2 p-3", awaiting && "bg-brass/5")}>
      <div className="flex items-start justify-between gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${item.reqCode} for bulk review`}
            className="mt-1 size-4 shrink-0 rounded border-input"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
              {item.reqCode}
            </span>
            <span className="text-sm">{item.title}</span>
            {item.blocking && (
              <span className="text-[10px] uppercase tracking-wide text-brass">required</span>
            )}
          </div>
          {item.documentName && (
            <button
              type="button"
              onClick={openDocument}
              disabled={pending}
              className="mt-1 flex items-center gap-1.5 text-xs text-signal underline"
            >
              <FileText className="size-3" /> {item.documentName}
              <ExternalLink className="size-3" />
            </button>
          )}
          {item.lastReview?.decision === "changes_requested" && item.lastReview.note && (
            <p className="mt-1 text-xs text-warn">You asked for: {item.lastReview.note}</p>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {done ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ok">
          <Check className="size-3.5" /> You marked this complete
        </span>
      ) : item.documentId ? (
        <div className="space-y-2">
          {asking ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What should they fix? e.g. the back of the licence is cut off"
                className="text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  disabled={pending || !note.trim()}
                  onClick={() => decide("changes_requested")}
                >
                  Send it back
                </Button>
                <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setAsking(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-[44px]" disabled={pending} onClick={() => decide("approved")}>
                <Check className="mr-1.5 size-3.5" /> Looks complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px]"
                disabled={pending}
                onClick={() => setAsking(true)}
              >
                <MessageSquareWarning className="mr-1.5 size-3.5" /> Ask for a fix
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-low">Waiting on the applicant to provide this.</p>
      )}
    </li>
  )
}
