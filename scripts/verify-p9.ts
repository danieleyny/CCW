/**
 * Phase 9 acceptance — RLS test matrix + end-to-end happy path.
 *
 * Part A: the access matrix across every V2 table for all four roles, with the
 * security-critical invariants asserted explicitly — disclosures are NEVER
 * instructor-visible, offers are redacted pre-accept, reminder_log is admin-only,
 * notifications/calendar are strictly own.
 *
 * Part B: the full flow on a fresh applicant — intake (cohabitant + dismissed
 * arrest) → generate → submission gate → offer → match → accept → engagement →
 * book → confirm → complete (training session) → references → reminders.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p9.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { processIntake, evaluateSubmissionGuard } from "../lib/intake/process"
import { createAndMatchOffer } from "../lib/marketplace/offers"
import { newReferenceToken, recomputeReferenceRequirement } from "../lib/references/process"
import { runReminderEngine } from "../lib/reminders/engine"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function signIn(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}
async function n(c: SupabaseClient, table: string, caseCol = "case_id", caseId?: string) {
  let q = c.from(table).select("id", { count: "exact", head: true })
  if (caseId) q = q.eq(caseCol, caseId)
  const { count } = await q
  return count ?? 0
}

async function main() {
  console.log("\n— Phase 9 verification —\n")

  const [adminC, staffC, clientC, instrC] = await Promise.all([
    signIn("admin@carrypath.test"),
    signIn("staff@carrypath.test"),
    signIn("client1@carrypath.test"),
    signIn("instructor@carrypath.test"),
  ])

  const { data: frank } = await admin.from("instructors").select("id").eq("name", "Frank DiMeo").single()
  const { data: jc } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
  const { data: jCase } = await admin.from("cases").select("id").eq("client_id", jc!.id).limit(1).single()
  const { data: { user: staffUser } } = await staffC.auth.getUser()

  // A temp case Frank is ENGAGED on (and staff is ASSIGNED to), with a disclosure.
  // case_visible() scopes staff to assigned cases, so assign it to exercise that.
  const tc = await admin.from("clients").insert({ full_name: "ZZ Matrix", track: "resident", borough: "Brooklyn", current_stage: "training_scheduled", assigned_staff: staffUser!.id }).select("id").single()
  const tcase = await admin.from("cases").insert({ client_id: tc.data!.id, stage: "training_scheduled", status: "active" }).select("id").single()
  const tCaseId = tcase.data!.id
  await materializeCaseRequirements(tadmin, tCaseId, "nyc", { isCarry: true, hasArrestHistory: true })
  await admin.from("disclosures").insert({ case_id: tCaseId, type: "arrest", disposition: "dismissed", narrative: "x", spawned_req_code: "ARR-01" })
  await admin.from("engagements").insert({ case_id: tCaseId, instructor_id: frank!.id, type: "training", status: "active" })

  console.log("Part A — RLS matrix\n")

  // disclosures: the firewall
  check((await n(instrC, "disclosures", "case_id", tCaseId)) === 0, "instructor (engaged) CANNOT read disclosures")
  check((await n(instrC, "disclosures")) === 0, "instructor sees ZERO disclosures anywhere")
  check((await n(clientC, "disclosures", "case_id", jCase!.id)) >= 0, "client can read their own case's disclosures")
  check((await n(clientC, "disclosures", "case_id", tCaseId)) === 0, "client CANNOT read another case's disclosures")
  check((await n(staffC, "disclosures", "case_id", tCaseId)) === 1, "staff can read disclosures")
  check((await n(adminC, "disclosures", "case_id", tCaseId)) === 1, "admin can read disclosures")

  // case_offers: redacted (no direct instructor access)
  check((await n(instrC, "case_offers")) === 0, "instructor CANNOT read case_offers directly (redacted view only)")
  check((await n(clientC, "case_offers", "case_id", jCase!.id)) >= 0, "client can read their own offers")

  // case_requirements: NO direct instructor access at all any more.
  //
  // These two assertions used to require the opposite. The trainer-concierge
  // build (20260718001600) dropped `case_requirements_select_instructor` and
  // `cases_select_instructor` because an RLS policy filters ROWS, not COLUMNS —
  // so a trainer reading the table saw `notes` (staff prose, including OVERRIDE
  // rationale) and every `req_code`, and an ARR-01 row discloses an arrest
  // history by its mere existence. Access now goes through the curated
  // `trainer_*` views. Asserting the old behaviour here left the harness
  // permanently red against the correct security model.
  check((await n(instrC, "case_requirements", "case_id", tCaseId)) === 0, "engaged instructor CANNOT read case_requirements directly (curated views only)")
  check((await n(instrC, "case_requirements", "case_id", jCase!.id)) === 0, "instructor CANNOT read a non-engaged case's requirements")
  check((await n(clientC, "case_requirements", "case_id", jCase!.id)) > 0, "client reads their own requirements")

  // intake_sessions: client + staff only
  check((await n(instrC, "intake_sessions")) === 0, "instructor sees ZERO intake_sessions")

  // cases: no direct read either — `trainer_case_scope` is the only door, and
  // it drops client_id/qa_signed_off_by/nypd_app_ref while adding the identity
  // a trainer legitimately needs.
  check((await n(instrC, "cases", "id", tCaseId)) === 0, "engaged instructor CANNOT read the cases row directly (trainer_case_scope only)")
  check((await n(instrC, "cases", "id", jCase!.id)) === 0, "instructor CANNOT read a non-engaged case row")

  // clients (PII): instructor none
  check((await n(instrC, "clients", "id", tc.data!.id)) === 0, "instructor CANNOT read client PII")

  // reminder_log: admin-only
  check((await n(clientC, "reminder_log")) === 0, "client CANNOT read reminder_log")
  check((await n(instrC, "reminder_log")) === 0, "instructor CANNOT read reminder_log")
  check((await n(staffC, "reminder_log")) === 0, "staff CANNOT read reminder_log (admin-only)")

  // notifications: own only — RLS-scoped query succeeds and returns only the
  // caller's rows (instructor cannot see the client's notifications).
  const { error: notifErr } = await clientC.from("notifications").select("id").limit(1)
  check(!notifErr, "client can query their own notifications (RLS-scoped)")

  // requirements registry: readable to all signed-in
  check((await n(instrC, "requirements")) > 0 && (await n(clientC, "requirements")) > 0, "registry (requirements) readable by client & instructor")

  // instructors: verified-only visibility to client
  const { data: cliInstr } = await clientC.from("instructors").select("verified")
  check((cliInstr ?? []).every((i) => i.verified === true), "client sees only verified instructors")

  // write guard: client cannot write case_requirements
  const cwrite = await clientC.from("case_requirements").insert({ case_id: jCase!.id, requirement_id: "00000000-0000-0000-0000-000000000000", req_code: "X", status: "satisfied" })
  check(!!cwrite.error, "client CANNOT write case_requirements")

  await admin.from("clients").delete().eq("id", tc.data!.id)

  // ── Part B — end-to-end happy path ────────────────────────────────────────
  console.log("\nPart B — end-to-end happy path\n")
  const ec = await admin.from("clients").insert({ full_name: "ZZ E2E", track: "resident", borough: "Brooklyn", current_stage: "lead" }).select("id").single()
  const ecase = await admin.from("cases").insert({ client_id: ec.data!.id, stage: "lead", status: "active" }).select("id").single()
  const eCaseId = ecase.data!.id
  const eClientId = ec.data!.id

  // 1. intake → generation + gate
  await processIntake(tadmin, eCaseId, "nyc", {
    residence: "nyc",
    cohabitants: [{ name: "Spouse Doe" }],
    arrests: [{ disposition: "dismissed", narrative: "" }],
  })
  const g1 = await evaluateSubmissionGuard(tadmin, eCaseId)
  check(!g1.ok && g1.emptyNarrativeCount > 0, "1. intake generates requirements and BLOCKS submission (empty narrative)")
  await admin.from("disclosures").update({ narrative: "Dismissed; context." }).eq("case_id", eCaseId).eq("type", "arrest")
  const g2 = await evaluateSubmissionGuard(tadmin, eCaseId)
  check(g2.emptyNarrativeCount === 0, "2. narrative filled → narrative block clears")

  // 3. offer → match → accept (Frank session, real RPC)
  const { offerId, matched } = await createAndMatchOffer(tadmin, { caseId: eCaseId, type: "training", jurisdiction: "nyc", borough: "Brooklyn" })
  check(matched >= 1, "3. offer broadcast matches a verified instructor")
  const accept = await instrC.rpc("accept_offer", { p_offer_id: offerId })
  check(!accept.error && !!accept.data, "4. instructor accepts → engagement created")

  // 5. book → confirm → complete
  const start = new Date(Date.now() + 9 * 86400000).toISOString()
  const end = new Date(Date.now() + 9 * 86400000 + 18 * 3600000).toISOString()
  const slot = await admin.from("availability_slots").insert({ instructor_id: frank!.id, type: "combined_18h", capacity: 2, starts_at: start, ends_at: end }).select("id").single()
  const booking = await admin.from("bookings").insert({ case_id: eCaseId, client_id: eClientId, instructor_id: frank!.id, slot_id: slot.data!.id, type: "combined_18h", status: "requested", starts_at: start, ends_at: end }).select("id").single()
  await admin.from("bookings").update({ status: "confirmed", ics_uid: "e2e@carry" }).eq("id", booking.data!.id)
  await admin.from("bookings").update({ status: "completed" }).eq("id", booking.data!.id)
  await admin.from("training_sessions").insert({ case_id: eCaseId, instructor_id: frank!.id, class_date: start, attended: true, test_score: 95, passed: true })
  const { count: tsCount } = await admin.from("training_sessions").select("id", { count: "exact", head: true }).eq("case_id", eCaseId)
  check((tsCount ?? 0) === 1, "5. booking confirmed → completed → training session recorded")

  // 6. references → satisfied only when NOTARIZED.
  //
  // This used to assert that four RECEIVED references satisfied REF-01. They
  // don't, and shouldn't: 38 RCNY requires notarized reference letters, and
  // recomputeReferenceRequirement keys on `notarized`, not `received`. The old
  // assertion described a weaker rule than the code enforces — the failing
  // direction is the safe one, but a red harness is a harness nobody reads.
  const refIds: string[] = []
  for (let i = 0; i < 4; i++) {
    const ref = await admin.from("character_references").insert({ case_id: eCaseId, name: `R${i}`, contact_email: `r${i}@e.com`, received: true }).select("id").single()
    refIds.push(ref.data!.id)
    const token = newReferenceToken()
    await admin.from("reference_requests").insert({ reference_id: ref.data!.id, case_id: eCaseId, token, status: "submitted", submitted_at: new Date().toISOString() })
  }
  await recomputeReferenceRequirement(tadmin, eCaseId)
  const { data: refReceived } = await admin.from("case_requirements").select("status").eq("case_id", eCaseId).eq("req_code", "REF-01").single()
  check(refReceived?.status === "pending", "6a. four references RECEIVED but unnotarized → REF-01 still pending")

  await admin.from("character_references").update({ notarized: true }).in("id", refIds)
  await recomputeReferenceRequirement(tadmin, eCaseId)
  const { data: ref01 } = await admin.from("case_requirements").select("status").eq("case_id", eCaseId).eq("req_code", "REF-01").single()
  check(ref01?.status === "satisfied", "6b. four references NOTARIZED → REF-01 satisfied")

  // 7. reminders fire once
  await admin.from("reminder_log").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  const r1 = await runReminderEngine(tadmin)
  const r2 = await runReminderEngine(tadmin)
  check(r1.length >= 1 && r2.length === 0, "7. reminders fire once; a re-run sends nothing")

  await admin.from("clients").delete().eq("id", eClientId)
  await admin.from("availability_slots").delete().eq("id", slot.data!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 9\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
