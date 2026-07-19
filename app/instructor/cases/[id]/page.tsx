import { notFound } from "next/navigation"
import { Lock, CalendarClock, MessageSquare, Mail, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import {
  getTrainerCase,
  getTrainerRequirements,
  getTrainerDocuments,
  getRosterProgress,
  getTrainerReviews,
  progressOf,
} from "@/lib/trainer/queries"
import { TrainerRequirementReview, type ReviewItem } from "@/components/trainer/requirement-review"
import { computeTrainerNextStep } from "@/lib/trainer/next-steps"
import { StatusBadge } from "@/components/shared/status-badge"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { confirmBooking, completeBooking, cancelBooking } from "../actions"
import { sendEngagementMessage } from "@/app/portal/actions"

export const metadata = { title: "Applicant" }

/**
 * The trainer's scoped concierge view.
 *
 * Every read here goes through a `trainer_*` view (lib/trainer/queries), never a
 * case table: a view can curate columns, and an RLS policy cannot. That's what
 * keeps `case_requirements.notes` — staff prose, including override rationale —
 * off this page, and what keeps disclosure requirements from appearing at all.
 * Their absence is the point: a locked row labelled "ARR-01" would itself tell
 * the trainer the applicant has an arrest history.
 */
export default async function InstructorCaseDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const kase = await getTrainerCase(supabase, id)
  if (!kase) notFound()

  const [reqs, docs, roster, reviews] = await Promise.all([
    getTrainerRequirements(supabase, id),
    getTrainerDocuments(supabase, id),
    getRosterProgress(supabase, id),
    getTrainerReviews(supabase, id),
  ])
  const progress = progressOf(reqs)
  const next = computeTrainerNextStep(reqs)
  const rosterByCode = new Map(roster.map((r) => [r.reqCode, r]))
  const docByReq = new Map(docs.map((d) => [d.caseRequirementId, d]))
  // Latest first from the query, so the first hit per item is the current one.
  const reviewByReq = new Map<string, (typeof reviews)[number]>()
  for (const r of reviews) if (!reviewByReq.has(r.caseRequirementId)) reviewByReq.set(r.caseRequirementId, r)

  const reviewItems: ReviewItem[] = reqs
    .filter((r) => r.status !== "na")
    .map((r) => {
      const p = rosterByCode.get(r.reqCode)
      const doc = docByReq.get(r.caseRequirementId)
      const last = reviewByReq.get(r.caseRequirementId)
      return {
        caseRequirementId: r.caseRequirementId,
        reqCode: r.reqCode,
        title: r.title,
        status: r.status,
        blocking: r.blocking,
        scope: r.scope,
        documentId: doc?.documentId ?? null,
        documentName: doc?.fileName ?? doc?.type ?? null,
        progress: p ? { done: p.doneCount, required: p.requiredCount } : null,
        lastReview: last ? { decision: last.decision, note: last.note, at: last.createdAt } : null,
      }
    })

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, type, status, starts_at")
    .eq("case_id", id)
    .order("starts_at", { ascending: true })

  const {
    data: { user: me },
  } = await supabase.auth.getUser()
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("engagement_id", kase.engagementId)
    .order("created_at")
  const chat: MessageRow[] = (msgs ?? []).map((m) => {
    const mine = m.sender_id === me?.id
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      // The applicant's name is now known for an active engagement, so the
      // thread reads like a conversation rather than a redacted transcript.
      senderName: mine ? "You" : kase.applicantName.split(" ")[0],
      senderRole: mine ? "instructor" : "client",
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{kase.applicantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stage: <b>{stageMeta(kase.stage as CaseStageKey).label}</b>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-mid">
          {kase.applicantEmail && (
            <a href={`mailto:${kase.applicantEmail}`} className="flex items-center gap-1.5 text-signal underline">
              <Mail className="size-3" /> {kase.applicantEmail}
            </a>
          )}
          {kase.applicantPhone && (
            <a href={`tel:${kase.applicantPhone}`} className="flex items-center gap-1.5 text-signal underline">
              <Phone className="size-3" /> {kase.applicantPhone}
            </a>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Paperwork you&apos;re helping with</span>
          <span className="font-mono text-xs tabular-nums text-text-mid">
            {progress.done} of {progress.total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-brass transition-[width]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-hairline bg-surface-2/50 px-4 py-3 text-xs text-text-mid">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Scoped view. Anything touching the applicant&apos;s disclosures — arrests, orders of
          protection, domestic incidents, the history questions — is handled by Gun License NYC and
          never appears here. Your review means &ldquo;complete and correct&rdquo;, not a legal
          judgement.
        </span>
      </div>

      <div
        className={
          next.owner === "handoff"
            ? "rounded-lg border border-ok/30 bg-ok/8 p-4"
            : "rounded-lg border border-hairline bg-surface-2/40 p-4"
        }
      >
        <div className="text-sm font-medium">{next.headline}</div>
        <p className="mt-1 text-xs text-text-mid">{next.detail}</p>
      </div>

      <TrainerRequirementReview items={reviewItems} />

      <div>
        <h2 className="engraved mb-2 text-text-low">Sessions</h2>
        {(bookings ?? []).length === 0 ? (
          <p className="text-sm text-text-mid">No sessions booked yet.</p>
        ) : (
          <ul className="space-y-2">
            {(bookings ?? []).map((bk) => (
              <li key={bk.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4 text-signal" />
                    {new Date(bk.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <StatusBadge status={bk.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {bk.status === "requested" && (
                    <form action={confirmBooking}>
                      <input type="hidden" name="bookingId" value={bk.id} />
                      <Button type="submit" size="sm">Confirm &amp; send invite</Button>
                    </form>
                  )}
                  {bk.status === "confirmed" && (
                    <form action={completeBooking} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="bookingId" value={bk.id} />
                      <Input name="testScore" type="number" min={0} max={100} placeholder="Score" className="h-8 w-20" />
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="passed" defaultChecked className="size-3.5" /> passed
                      </label>
                      <Button type="submit" size="sm" variant="outline">Mark complete</Button>
                    </form>
                  )}
                  {(bk.status === "requested" || bk.status === "confirmed") && (
                    <form action={cancelBooking}>
                      <input type="hidden" name="bookingId" value={bk.id} />
                      <Button type="submit" size="sm" variant="ghost">Cancel</Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="engraved mb-2 flex items-center gap-2 text-text-low">
          <MessageSquare className="size-3.5" /> Message {kase.applicantName.split(" ")[0]}
        </h2>
        <div className="rounded-lg border bg-card p-4">
          <MessageThread
            caseId={kase.engagementId}
            messages={chat}
            send={sendEngagementMessage}
            placeholder="Message your applicant…"
          />
        </div>
      </div>
    </div>
  )
}
