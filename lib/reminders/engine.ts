/**
 * Rule-driven reminder engine (no `server-only` so the cron wrapper and the
 * verify harness can both drive it). Idempotency is the whole point: every send
 * is gated on a unique (rule_key, target, window_key) row in reminder_log, so a
 * daily cron re-run fires nothing new. In-app notifications are written here;
 * the server-only wrapper layers email on top of the returned fired list.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { computeFeeSummary } from "@/lib/fees"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { LEGAL_REVIEW_STALE_DAYS } from "@/lib/legal-status"

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

  // ── V3-P2.6 Rule: booking starts in 24h / 2h → remind the client ──────────
  const { data: upcoming } = await admin
    .from("bookings")
    .select("id, case_id, starts_at, type")
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + DAY).toISOString())
  const upcomingContacts = await caseContacts(admin, (upcoming ?? []).map((b) => b.case_id))
  for (const b of upcoming ?? []) {
    const hoursOut = (new Date(b.starts_at).getTime() - now.getTime()) / 3600000
    const bucket = hoursOut <= 2 ? "2h" : "24h"
    const c = upcomingContacts.get(b.case_id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: `booking_${bucket}`,
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${b.id}:${bucket}`,
      caseId: b.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "booking",
      title: bucket === "2h" ? "Your training session starts soon" : "Training session tomorrow",
      body: `Your ${b.type.replace(/_/g, " ")} session starts ${bucket === "2h" ? "in about 2 hours" : "within 24 hours"}. Bring photo ID.`,
      link: "/portal/marketplace",
    }))
  }

  // ── V3-P2.6 Rule: case stalled past the stage SLA → nudge the OWNER ───────
  const STALL_DAYS = 14
  const TERMINAL = ["licensed", "decision"]
  const { data: stalled } = await admin
    .from("cases")
    .select("id, stage, stage_entered_at, clients(assigned_staff)")
    .eq("status", "active")
    .lte("stage_entered_at", new Date(now.getTime() - STALL_DAYS * DAY).toISOString())
  for (const k of stalled ?? []) {
    if (TERMINAL.includes(k.stage)) continue
    const staffId = (k.clients as unknown as { assigned_staff: string | null } | null)?.assigned_staff
    if (!staffId) continue
    push(await fireOnce(admin, {
      ruleKey: "stage_stalled",
      target: staffId,
      windowKey: `${k.id}:${k.stage}`, // once per stage entry
      caseId: k.id,
      recipient: staffId,
      kind: "action_required",
      title: "A case has stalled",
      body: `A case has sat in "${k.stage.replace(/_/g, " ")}" for ${STALL_DAYS}+ days with no stage change.`,
      link: `/admin/cases/${k.id}`,
    }))
  }

  // ── V3-P2.6 Rule: long-lead nudge (day 3 / day 7) — the primary lever ─────
  // Training is the long pole and it EXPIRES; if it hasn't started in week one
  // the case is already late.
  const { data: youngCases } = await admin
    .from("cases")
    .select("id, opened_at")
    .eq("status", "active")
    .lte("opened_at", new Date(now.getTime() - 3 * DAY).toISOString())
    .gte("opened_at", new Date(now.getTime() - 30 * DAY).toISOString())
  const youngIds = (youngCases ?? []).map((c) => c.id)
  const { data: trnPending } = youngIds.length
    ? await admin
        .from("case_requirements")
        .select("case_id, req_code")
        .in("case_id", youngIds)
        .in("req_code", ["TRN-01", "RNW-01"])
        .eq("status", "pending")
    : { data: [] as { case_id: string; req_code: string }[] }
  const trnPendingSet = new Set((trnPending ?? []).map((r) => r.case_id))
  const nudgeContacts = await caseContacts(admin, [...trnPendingSet])
  for (const k of youngCases ?? []) {
    if (!trnPendingSet.has(k.id)) continue
    const days = (now.getTime() - new Date(k.opened_at).getTime()) / DAY
    const bucket = days >= 7 ? "7d" : "3d"
    const c = nudgeContacts.get(k.id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "long_lead_nudge",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${k.id}:${bucket}`,
      caseId: k.id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "Book your safety training now — it's the longest step",
      body: "The 16+2-hour course is the longest-lead item, and the certificate must be recent when you file. Booking it this week keeps everything on schedule.",
      link: "/portal/marketplace",
    }))
  }

  // ── Rule: fees are about to matter → tell them what to have ready ────────
  // The money is the part that ambushes people at filing. Fire once per case
  // when they reach document collection, with the amount they actually owe —
  // read from the fee schedule, and reflecting the retired-LEO waiver.
  const { data: feeStage } = await admin
    .from("cases")
    .select("id, is_renewal, stage")
    .eq("status", "active")
    .in("stage", ["document_collection", "notarization"])
  const feeContacts = await caseContacts(admin, (feeStage ?? []).map((k) => k.id))
  for (const k of feeStage ?? []) {
    const c = feeContacts.get(k.id)
    if (!c) continue
    const { data: session } = await admin
      .from("intake_sessions")
      .select("answers")
      .eq("case_id", k.id)
      .maybeSingle()
    const answers = (session?.answers ?? {}) as { isRetiredLeo?: boolean }
    const summary = await computeFeeSummary(admin, {
      isRetiredLeo: answers.isRetiredLeo,
      isRenewal: k.is_renewal,
    })
    const [application, fingerprint] = summary.items
    push(await fireOnce(admin, {
      ruleKey: "fee_readiness",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: k.id, // once per case
      caseId: k.id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "Have your filing fees ready",
      body: application.waived
        ? `Your NYPD application fee is waived as retired law enforcement. You'll still pay ${fingerprint.amount} to the fingerprint vendor at your appointment. Neither fee is paid to us.`
        : `You'll pay ${application.amount} to the NYPD when you submit, and about ${fingerprint.amount} to the fingerprint vendor at your appointment — ${summary.total} in total, paid directly to them, never to us.`,
      link: "/portal/checklist",
    }))
  }

  // ── Rule: fingerprinting booked → the fee is due in person ───────────────
  const { data: printing } = await admin
    .from("cases")
    .select("id, is_renewal")
    .eq("status", "active")
    .eq("stage", "fingerprinting_booked")
  const printContacts = await caseContacts(admin, (printing ?? []).map((k) => k.id))
  for (const k of printing ?? []) {
    const c = printContacts.get(k.id)
    if (!c) continue
    const summary = await computeFeeSummary(admin, { isRenewal: k.is_renewal })
    push(await fireOnce(admin, {
      ruleKey: "fingerprint_fee_due",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: k.id,
      caseId: k.id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "Bring your fingerprint fee and ID",
      body: `The fingerprint fee (about ${summary.items[1].amount}) is paid to the vendor at your appointment — card, check, or money order payable to IDEMIA. Confirm the exact amount when you arrive, and bring your photo ID. Your fee sheet has the details.`,
      link: "/portal/checklist",
    }))
  }

  // ── V3-P2.6 Rule: pre-filing QA gate cleared → tell the consultant ────────
  const { data: nearFiling } = await admin
    .from("cases")
    .select("id, qa_signed_off_by, clients(assigned_staff)")
    .eq("status", "active")
    .in("stage", ["document_collection", "notarization"])
  for (const k of nearFiling ?? []) {
    if (k.qa_signed_off_by) continue
    const staffId = (k.clients as unknown as { assigned_staff: string | null } | null)?.assigned_staff
    if (!staffId) continue
    const gate = await evaluatePreFilingGate(admin, k.id)
    if (!gate.readyForSignOff) continue
    push(await fireOnce(admin, {
      ruleKey: "qa_ready",
      target: staffId,
      windowKey: k.id, // once per case
      caseId: k.id,
      recipient: staffId,
      kind: "action_required",
      title: "A case is ready for pre-filing QA sign-off",
      body: "Every gate check passes — review and sign off so the case can be assembled.",
      link: `/admin/cases/${k.id}`,
    }))
  }

  // ── V3-P3.2 Rule: purchase authorization expiring (≤7 days, unused) ───────
  const { data: expAuths } = await admin
    .from("purchase_authorizations")
    .select("id, case_id, expires_on")
    .is("acquired_on", null)
    .gte("expires_on", now.toISOString().slice(0, 10))
    .lte("expires_on", new Date(now.getTime() + 7 * DAY).toISOString().slice(0, 10))
  const authContacts = await caseContacts(admin, (expAuths ?? []).map((a) => a.case_id))
  for (const a of expAuths ?? []) {
    const c = authContacts.get(a.case_id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "purchase_auth_expiring",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: a.id,
      caseId: a.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "Your purchase authorization expires soon",
      body: `Your authorization is valid through ${a.expires_on} (30-day limit). If you plan to purchase, do it before it lapses.`,
      link: "/portal/license",
    }))
  }

  // ── V3-P3.2 Rule: 72-hour inspection due/overdue ──────────────────────────
  const { data: inspections } = await admin
    .from("purchase_authorizations")
    .select("id, case_id, inspection_due")
    .not("acquired_on", "is", null)
    .is("inspected_on", null)
    .lte("inspection_due", new Date(now.getTime() + DAY).toISOString())
  const inspContacts = await caseContacts(admin, (inspections ?? []).map((a) => a.case_id))
  for (const a of inspections ?? []) {
    const c = inspContacts.get(a.case_id)
    if (!c || !a.inspection_due) continue
    const overdue = new Date(a.inspection_due).getTime() < now.getTime()
    push(await fireOnce(admin, {
      ruleKey: "inspection_due",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${a.id}:${overdue ? "overdue" : "24h"}`,
      caseId: a.case_id,
      recipient: c.profileId,
      email: c.email,
      kind: "action_required",
      title: overdue ? "Handgun inspection is OVERDUE" : "Handgun inspection due within 24 hours",
      body: "A purchased handgun must be presented for inspection within 72 hours of acquisition. This is a hard deadline — don't miss it.",
      link: "/portal/license",
    }))
  }

  // ── V3-P3.2 Rule: renewal runway opens at T-9 months ──────────────────────
  const { data: expiringLicenses } = await admin
    .from("cases")
    .select("id, license_expires_on")
    .eq("stage", "licensed")
    .not("license_expires_on", "is", null)
    .lte("license_expires_on", new Date(now.getTime() + 270 * DAY).toISOString().slice(0, 10))
    .gte("license_expires_on", now.toISOString().slice(0, 10))
  const runwayContacts = await caseContacts(admin, (expiringLicenses ?? []).map((k) => k.id))
  for (const k of expiringLicenses ?? []) {
    const c = runwayContacts.get(k.id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "renewal_runway",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${k.id}:9mo`,
      caseId: k.id,
      recipient: c.profileId,
      email: c.email,
      kind: "reminder",
      title: "Your renewal runway is open",
      body: `Your license expires ${k.license_expires_on}. NYPD mails renewal instructions — you can't submit early, but your refreshed 2-hour live-fire cert must be dated within 6 months of the renewal. Plan it now; no character references needed.`,
      link: "/portal/license",
    }))
  }

  // ── V4-A4d Rule: training decays — warn before it lapses (T-60 / T-30) ────
  // Live-fire training must be ≤6 months old at submission. A case that hasn't
  // filed yet and whose cert will lapse inside 60 days is about to need a
  // refresher; nudge the applicant AND their consultant so it doesn't stall.
  const PRE_FILING: Database["public"]["Enums"]["case_stage"][] = [
    "lead",
    "eligibility_screened",
    "signed_up_paid",
    "training_scheduled",
    "training_complete",
    "document_collection",
    "notarization",
  ]
  const { data: trainingExpiring } = await admin
    .from("cases")
    .select("id, training_expires_on, stage, clients(assigned_staff)")
    .eq("status", "active")
    .not("training_expires_on", "is", null)
    .in("stage", PRE_FILING)
    .lte("training_expires_on", new Date(now.getTime() + 60 * DAY).toISOString().slice(0, 10))
    .gte("training_expires_on", now.toISOString().slice(0, 10))
  const trainContacts = await caseContacts(admin, (trainingExpiring ?? []).map((k) => k.id))
  for (const k of trainingExpiring ?? []) {
    const daysLeft = Math.ceil(
      (new Date(`${k.training_expires_on}T00:00:00Z`).getTime() - now.getTime()) / DAY
    )
    const bucket = daysLeft <= 30 ? "30" : "60"
    const c = trainContacts.get(k.id)
    const title = "Your live-fire training is close to expiring"
    const body = `Your training certificate expires ${k.training_expires_on} (~${Math.max(daysLeft, 0)} days). It must be dated within 6 months of when you submit, so schedule a refresher if you won't file before then.`
    if (c && (c.profileId || c.email)) {
      push(await fireOnce(admin, {
        ruleKey: "training_expiring",
        target: c.profileId ?? c.email ?? c.clientId,
        windowKey: `${k.id}:${bucket}`,
        caseId: k.id,
        recipient: c.profileId,
        email: c.email,
        kind: "action_required",
        title,
        body,
        link: "/portal/checklist",
      }))
    }
    const staffId = (k.clients as unknown as { assigned_staff: string | null } | null)?.assigned_staff
    if (staffId) {
      push(await fireOnce(admin, {
        ruleKey: "training_expiring",
        target: staffId,
        windowKey: `${k.id}:${bucket}`,
        caseId: k.id,
        recipient: staffId,
        kind: "action_required",
        title: "A case's training is close to expiring",
        body: `Training on this case expires ${k.training_expires_on} (~${Math.max(daysLeft, 0)} days). If it won't file before then, a refresher is needed to keep the cert ≤6 months at submission.`,
        link: `/admin/cases/${k.id}`,
      }))
    }
  }

  // ── V3-P3.2 Rule: Special Carry county-license dependency (≤60 days) ──────
  const { data: countyExpiring } = await admin
    .from("cases")
    .select("id, county_license_expires_on")
    .not("county_license_expires_on", "is", null)
    .lte("county_license_expires_on", new Date(now.getTime() + 60 * DAY).toISOString().slice(0, 10))
    .gte("county_license_expires_on", now.toISOString().slice(0, 10))
  const countyContacts = await caseContacts(admin, (countyExpiring ?? []).map((k) => k.id))
  for (const k of countyExpiring ?? []) {
    const c = countyContacts.get(k.id)
    if (!c) continue
    push(await fireOnce(admin, {
      ruleKey: "county_license_expiring",
      target: c.profileId ?? c.email ?? c.clientId,
      windowKey: `${k.id}:${k.county_license_expires_on}`,
      caseId: k.id,
      recipient: c.profileId,
      email: c.email,
      kind: "action_required",
      title: "Your county license expires soon — Special Carry depends on it",
      body: `Your underlying county license expires ${k.county_license_expires_on}. If it lapses, your Special Carry voids automatically. Renew the county license first.`,
      link: "/portal/license",
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

  // ── V5b-A Rule: Law Watch — a registry rule change is a dated data edit, so a
  // new `requirements` row whose effective_from just landed IS the change. Notify
  // every law-watch subscriber for that jurisdiction, once per version (windowKey
  // = the version date). No sales copy — that restraint is why people trust it.
  const sinceDate = new Date(now.getTime() - DAY).toISOString().slice(0, 10)
  const todayDate = now.toISOString().slice(0, 10)
  const { data: changedReqs } = await admin
    .from("requirements")
    .select("req_code, effective_from, authority, source_url, jurisdiction_profiles(key)")
    .gte("effective_from", sinceDate)
    .lte("effective_from", todayDate)
  if (changedReqs && changedReqs.length) {
    const { data: watchers } = await admin
      .from("subscribers")
      .select("email, jurisdiction")
      .eq("offer", "law-watch")
      .is("unsubscribed_at", null)
    for (const r of changedReqs) {
      const jkey = (r.jurisdiction_profiles as unknown as { key: string } | null)?.key
      const jur = jkey === "nyc" || jkey === "special_carry" ? "ny" : null
      if (!jur) continue
      for (const w of watchers ?? []) {
        // A subscriber with no jurisdiction set wants the default (NY) feed.
        if (w.jurisdiction && w.jurisdiction !== jur) continue
        push(await fireOnce(admin, {
          ruleKey: "law_watch",
          target: w.email,
          windowKey: `${r.req_code}:${r.effective_from}`,
          email: w.email,
          kind: "reminder",
          title: `NYC carry requirement update — ${r.req_code}`,
          body: `A requirement changed, effective ${r.effective_from}. Authority: ${r.authority ?? "—"}.${r.source_url ? ` Source: ${r.source_url}` : ""} Full details: concealedknowledge.com/updates`,
          link: "https://concealedknowledge.com/updates",
        }))
      }
    }
  }

  // ── PART A/P1 Rule: quarterly registry legal review. A rule confirmed last
  // year may have been enjoined since — NYC is litigation-driven. This is the
  // standing cadence that makes /admin/legal's staleness visible instead of
  // waiting for someone to wonder.
  //
  // fireOnce's (rule_key, target, window_key) upsert does the scheduling: the
  // quarter string is the window, so this fires on the first cron tick of each
  // quarter and never again. No separate scheduler needed.
  const quarter = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`
  const staleCutoff = new Date(now.getTime() - LEGAL_REVIEW_STALE_DAYS * DAY).toISOString().slice(0, 10)
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin")
  if (admins && admins.length) {
    const { count: staleCount } = await admin
      .from("requirements")
      .select("id", { count: "exact", head: true })
      .is("effective_to", null)
      .eq("needs_legal_review", false)
      .or(`verified_on.is.null,verified_on.lt.${staleCutoff}`)

    let firedForAnyone = false
    for (const a of admins) {
      const f = await fireOnce(admin, {
        ruleKey: "legal_review_quarterly",
        target: a.id,
        windowKey: quarter,
        recipient: a.id,
        kind: "action_required",
        title: `Quarterly requirement legal review — ${quarter}`,
        body: `${staleCount ?? 0} active rule(s) have not been attorney-verified in ${LEGAL_REVIEW_STALE_DAYS}+ days. Re-check each rule's enforcement status and citation.`,
        link: "/admin/legal",
      })
      if (f) firedForAnyone = true
      push(f)
    }
    // One task for the queue, not one per admin — and only when the window
    // actually opened, so the hourly cron doesn't re-insert it all quarter.
    if (firedForAnyone) {
      await admin.from("tasks").insert({
        case_id: null,
        title: `Quarterly requirement legal review — ${quarter}`,
        description: `Re-confirm every active registry rule's legal enforcement status and citation in /admin/legal. ${staleCount ?? 0} rule(s) are past the ${LEGAL_REVIEW_STALE_DAYS}-day mark.`,
        priority: 1,
        status: "open",
      })
    }
  }

  return fired
}
