/**
 * Rule-driven reminder engine (no `server-only` so the cron wrapper and the
 * verify harness can both drive it). Idempotency is the whole point: every send
 * is gated on a unique (rule_key, target, window_key) row in reminder_log, so a
 * daily cron re-run fires nothing new. In-app notifications are written here;
 * the server-only wrapper layers email on top of the returned fired list.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>
type Kind = Database["public"]["Enums"]["notification_kind"]

export interface Fired {
  ruleKey: string
  caseId: string | null
  email: string | null
  title: string
  body: string
}

interface FireInput {
  ruleKey: string
  target: string
  windowKey: string
  caseId?: string | null
  recipient?: string | null // profile id → in-app notification
  email?: string | null
  kind: Kind
  title: string
  body: string
  link?: string
}

/** Gate on reminder_log; on first occurrence write the in-app notification. */
async function fireOnce(admin: DB, input: FireInput): Promise<Fired | null> {
  if (!input.recipient && !input.email) return null
  const { data: inserted } = await admin
    .from("reminder_log")
    .upsert(
      { rule_key: input.ruleKey, target: input.target, window_key: input.windowKey, case_id: input.caseId ?? null },
      { onConflict: "rule_key,target,window_key", ignoreDuplicates: true }
    )
    .select("id")
  if (!inserted || inserted.length === 0) return null // already sent

  if (input.recipient) {
    await admin.from("notifications").insert({
      recipient: input.recipient,
      case_id: input.caseId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    })
  }
  return { ruleKey: input.ruleKey, caseId: input.caseId ?? null, email: input.email ?? null, title: input.title, body: input.body }
}

interface Contact {
  clientId: string
  profileId: string | null
  email: string | null
  name: string
}

/** Resolve a set of case_ids to their client contact info. */
async function caseContacts(admin: DB, caseIds: string[]): Promise<Map<string, Contact>> {
  const out = new Map<string, Contact>()
  const ids = [...new Set(caseIds)]
  if (!ids.length) return out
  const { data: cases } = await admin.from("cases").select("id, client_id").in("id", ids)
  const caseToClient = new Map((cases ?? []).map((c) => [c.id, c.client_id]))
  const clientIds = [...new Set([...caseToClient.values()])]
  const { data: clients } = await admin.from("clients").select("id, profile_id, email, full_name").in("id", clientIds)
  const byClient = new Map((clients ?? []).map((c) => [c.id, c]))
  for (const [caseId, clientId] of caseToClient) {
    const cl = byClient.get(clientId)
    if (cl) out.set(caseId, { clientId, profileId: cl.profile_id, email: cl.email, name: cl.full_name })
  }
  return out
}

const DAY = 86400000

/** Run every rule once. Returns the notifications that actually fired this run. */
export async function runReminderEngine(admin: DB, now = new Date()): Promise<Fired[]> {
  const fired: Fired[] = []
  const push = (f: Fired | null) => { if (f) fired.push(f) }

  // ── Rule: a document was rejected → nudge the client to re-upload ─────────
  const { data: rejected } = await admin
    .from("documents")
    .select("id, type, case_id")
    .eq("status", "rejected")
  const rejectedContacts = await caseContacts(admin, (rejected ?? []).map((d) => d.case_id))
  for (const d of rejected ?? []) {
    const c = rejectedContacts.get(d.case_id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "doc_rejected",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: d.id, // once per rejected document
      caseId: d.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "action_required",
      title: "A document needs a fix",
      body: `Your ${d.type.replace(/_/g, " ")} was sent back — please re-upload it.`,
      link: "/portal/documents",
    }))
  }

  // ── Rule: a reference is unfilled at 3 and 7 days ─────────────────────────
  const { data: refReqs } = await admin
    .from("reference_requests")
    .select("id, case_id, sent_at, status")
    .in("status", ["sent", "opened"])
  const refContacts = await caseContacts(admin, (refReqs ?? []).map((r) => r.case_id))
  for (const r of refReqs ?? []) {
    if (!r.sent_at) continue
    const days = (now.getTime() - new Date(r.sent_at).getTime()) / DAY
    const bucket = days >= 7 ? "7d" : days >= 3 ? "3d" : null
    if (!bucket) continue
    const c = refContacts.get(r.case_id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "reference_unfilled",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${r.id}:${bucket}`,
      caseId: r.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "A character reference is still pending",
      body: `One of your references hasn't responded yet (${bucket}). A reminder may help.`,
      link: "/portal/people",
    }))
  }

  // ── Rule: a booking was confirmed → confirm to the client ─────────────────
  const { data: confirmed } = await admin
    .from("bookings")
    .select("id, case_id")
    .eq("status", "confirmed")
  const bookingContacts = await caseContacts(admin, (confirmed ?? []).map((b) => b.case_id))
  for (const b of confirmed ?? []) {
    const c = bookingContacts.get(b.case_id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "booking_confirmed",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: b.id,
      caseId: b.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "booking",
      title: "Your training session is confirmed",
      body: "Your instructor confirmed your session. Check your calendar invite.",
      link: "/portal/marketplace",
    }))
  }

  // ── Rule: a new offer is waiting in an instructor's feed ──────────────────
  const { data: matches } = await admin
    .from("offer_matches")
    .select("offer_id, instructor_id, responded")
    .is("responded", null)
  const offerIds = [...new Set((matches ?? []).map((m) => m.offer_id))]
  const { data: openOffers } = offerIds.length
    ? await admin.from("case_offers").select("id").eq("status", "open").in("id", offerIds)
    : { data: [] as { id: string }[] }
  const openSet = new Set((openOffers ?? []).map((o) => o.id))
  const openMatches = (matches ?? []).filter((m) => openSet.has(m.offer_id))
  const instrIds = [...new Set(openMatches.map((m) => m.instructor_id))]
  const { data: instrs } = instrIds.length
    ? await admin.from("instructors").select("id, profile_id, email").in("id", instrIds)
    : { data: [] as { id: string; profile_id: string | null; email: string | null }[] }
  const byInstr = new Map((instrs ?? []).map((i) => [i.id, i]))
  for (const m of openMatches) {
    const i = byInstr.get(m.instructor_id)
    if (!i) continue
    push(await fireOnce(admin, {
      ruleKey: "new_offer",
      target: i.profile_id ?? i.email ?? i.id,
      windowKey: `${m.offer_id}:${m.instructor_id}`,
      recipient: i.profile_id,
      email: i.email,
      kind: "offer",
      title: "A new case is waiting in your feed",
      body: "A local applicant near you requested help. Review it in your feed.",
      link: "/instructor/feed",
    }))
  }

  return fired
}
