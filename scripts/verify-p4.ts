/**
 * Phase 4 acceptance — Marketplace offers / redacted feed / accept.
 * Proves the critical gate test:
 *   - a client offer matches verified in-radius instructors (Frank), not the
 *     unverified one (Lena);
 *   - instructors see a REDACTED feed (no name/email/address/client_id) and
 *     cannot read case_offers directly;
 *   - a non-matched instructor sees nothing and cannot accept;
 *   - on accept an engagement is created and the instructor gets SCOPED case
 *     access (case + requirements) but NO disclosures and NO client PII.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p4.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { createAndMatchOffer } from "../lib/marketplace/offers"

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
  await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  return c
}

async function main() {
  console.log("\n— Phase 4 verification —\n")

  const { data: frank } = await admin.from("instructors").select("id").eq("name", "Frank DiMeo").single()

  // ── Setup: a Brooklyn applicant with a disclosure + requirements ──────────
  const c = await admin.from("clients").insert({ full_name: "ZZ Market Test", track: "resident", borough: "Brooklyn", current_stage: "training_scheduled" }).select("id").single()
  const k = await admin.from("cases").insert({ client_id: c.data!.id, stage: "training_scheduled", status: "active" }).select("id").single()
  const caseId = k.data!.id
  const clientId = c.data!.id
  await materializeCaseRequirements(tadmin, caseId, "nyc", { isCarry: true, hasArrestHistory: true })
  await admin.from("disclosures").insert({ case_id: caseId, type: "arrest", disposition: "dismissed", narrative: "context", spawned_req_code: "ARR-01" })

  // ── Create + match the offer ──────────────────────────────────────────────
  const { offerId, matched } = await createAndMatchOffer(tadmin, { caseId, type: "training", jurisdiction: "nyc", borough: "Brooklyn" })
  check(matched >= 1, `offer matched ${matched} verified in-radius instructor(s)`)
  const { data: matchRows } = await admin.from("offer_matches").select("instructor_id, instructors(name, verified)").eq("offer_id", offerId)
  const matchedNames = (matchRows ?? []).map((m) => (m.instructors as unknown as { name: string }).name)
  check(matchedNames.includes("Frank DiMeo"), "verified Frank was matched")
  check(!matchedNames.includes("Lena Ortiz"), "unverified Lena was NOT matched")

  // ── Frank: redacted feed, no direct case_offers access ────────────────────
  const fi = await signIn("instructor@carrypath.test")
  const { data: feed } = await fi.from("instructor_offer_feed").select("*")
  const row = (feed ?? []).find((r: { offer_id: string }) => r.offer_id === offerId)
  check(!!row, "instructor sees the offer in the redacted feed")
  const piiKeys = ["name", "full_name", "email", "address", "client_id", "phone"]
  const leaked = row ? Object.keys(row).filter((kk) => piiKeys.includes(kk)) : ["(no row)"]
  check(!!row && leaked.length === 0, `feed exposes NO client PII (leaked: ${leaked.join(",") || "none"})`)
  const direct = await fi.from("case_offers").select("id").eq("id", offerId)
  check((direct.data ?? []).length === 0, "instructor CANNOT read case_offers directly (RLS)")

  // ── A non-matched verified instructor sees nothing & cannot accept ────────
  const otherId = (await admin.auth.admin.createUser({ email: "ztest-instr@carrypath.test", password: "Passw0rd!", email_confirm: true, user_metadata: { full_name: "ZZ Other Instr", role: "instructor" } })).data.user!.id
  await admin.from("instructors").insert({ name: "ZZ Other Instr", email: "ztest-instr@carrypath.test", profile_id: otherId, verified: true, verified_at: new Date().toISOString(), lat: 40.5795, lng: -74.1502, jurisdictions: ["nyc"], rating_count: 0 })
  const other = await signIn("ztest-instr@carrypath.test")
  const { data: otherFeed } = await other.from("instructor_offer_feed").select("offer_id")
  check(!(otherFeed ?? []).some((r: { offer_id: string }) => r.offer_id === offerId), "a non-matched instructor does NOT see the offer")
  const otherAccept = await other.rpc("accept_offer", { p_offer_id: offerId })
  check(!!otherAccept.error, "a non-matched instructor CANNOT accept (RPC rejects)")

  // ── Frank accepts → engagement + scoped access ────────────────────────────
  const accept = await fi.rpc("accept_offer", { p_offer_id: offerId })
  check(!accept.error && !!accept.data, "matched instructor accepts → engagement created")
  const { data: eng } = await admin.from("engagements").select("status, instructor_id").eq("id", accept.data as string).single()
  check(eng?.status === "active" && eng?.instructor_id === frank!.id, "engagement is active and bound to Frank")
  const { data: offerAfter } = await admin.from("case_offers").select("status").eq("id", offerId).single()
  check(offerAfter?.status === "accepted", "offer is marked accepted")

  // scoped access checks (Frank)
  const caseRead = await fi.from("cases").select("id, stage").eq("id", caseId)
  check((caseRead.data ?? []).length === 1, "engaged instructor CAN read the case (stage)")
  const reqRead = await fi.from("case_requirements").select("id").eq("case_id", caseId)
  check((reqRead.data ?? []).length > 0, "engaged instructor CAN read the requirement checklist")
  const discRead = await fi.from("disclosures").select("id").eq("case_id", caseId)
  check((discRead.data ?? []).length === 0, "engaged instructor CANNOT read disclosures (firewall holds)")
  const cliRead = await fi.from("clients").select("id").eq("id", clientId)
  check((cliRead.data ?? []).length === 0, "engaged instructor CANNOT read client PII")

  // ── cleanup ────────────────────────────────────────────────────────────────
  await admin.from("clients").delete().eq("id", clientId) // cascades case/offers/matches/engagements/reqs/disclosures
  await admin.from("instructors").delete().eq("profile_id", otherId)
  await admin.auth.admin.deleteUser(otherId)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 4\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
