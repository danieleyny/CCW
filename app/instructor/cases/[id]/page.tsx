import { notFound } from "next/navigation"
import { Lock, CalendarClock, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCaseRequirements } from "@/lib/requirements"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { StatusBadge } from "@/components/shared/status-badge"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { confirmBooking, completeBooking, cancelBooking } from "../actions"
import { sendEngagementMessage } from "@/app/portal/actions"

export const metadata = { title: "Case (scoped)" }

export default async function InstructorCaseDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS (cases_select_instructor) returns this only if the instructor is engaged.
  const { data: kase } = await supabase.from("cases").select("id, stage").eq("id", id).maybeSingle()
  if (!kase) notFound()

  // Scoped checklist (RLS: case_requirements_select_instructor). No disclosures,
  // no documents, no client identity are loaded here — by design.
  const reqs = await getCaseRequirements(supabase, id)
  const applicable = reqs.filter((r) => r.status !== "na")

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, type, status, starts_at")
    .eq("case_id", id)
    .order("starts_at", { ascending: true })

  // The instructor↔applicant chat for this engagement (RLS returns only theirs).
  const { data: eng } = await supabase
    .from("engagements")
    .select("id")
    .eq("case_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  let chat: MessageRow[] = []
  if (eng) {
    const {
      data: { user: me },
    } = await supabase.auth.getUser()
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, created_at, sender_id")
      .eq("engagement_id", eng.id)
      .order("created_at")
    // Firewall: the instructor never sees the applicant's real name — their
    // messages read as "Applicant". The instructor's own show as "You".
    chat = (msgs ?? []).map((m) => {
      const mine = m.sender_id === me?.id
      return {
        id: m.id,
        body: m.body,
        created_at: m.created_at,
        senderName: mine ? "You" : "Applicant",
        senderRole: mine ? "instructor" : "client",
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Case progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stage: <b>{stageMeta(kase.stage as CaseStageKey).label}</b>
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface-2/50 px-4 py-3 text-xs text-text-mid">
        <Lock className="size-3.5" /> Scoped view — the client&apos;s name, contact,
        documents, and disclosures are not shared with instructors.
      </div>

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

      {eng && (
        <div>
          <h2 className="engraved mb-2 flex items-center gap-2 text-text-low">
            <MessageSquare className="size-3.5" /> Message the applicant
          </h2>
          <div className="rounded-lg border bg-card p-4">
            <MessageThread
              caseId={eng.id}
              messages={chat}
              send={sendEngagementMessage}
              placeholder="Message your applicant…"
            />
          </div>
        </div>
      )}

      <div>
        <h2 className="engraved mb-2 text-text-low">Requirements ({applicable.length})</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {applicable.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
                    {r.req_code}
                  </span>
                  <span className="text-sm">{r.requirement?.title ?? r.req_code}</span>
                </div>
                {r.notes && <p className="mt-0.5 text-xs text-text-low">{r.notes}</p>}
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
