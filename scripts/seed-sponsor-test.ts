/**
 * One-off: stand up a TEST two-party sponsored case on whatever DB the env points
 * at (run with the PROD env to seed hosted). Mirrors the real ISS/Chery flow:
 *   • an UNCLAIMED applicant (claim-by-email on first signup) + a case pre-seeded
 *     as an NYC Carry Guard file (armed requirements + the company packet);
 *   • a provisioned sponsor rep (role='sponsor') + an unconsented full-scope
 *     sponsorship, so the tester experiences granting consent as the applicant.
 *
 * Idempotent: re-running wipes the prior test rows for THIS run's identities first.
 *
 * Env:
 *   QA_SUFFIX=-qa2   isolate a run (email plus-part + company name); refused if malformed
 *   QA_PRECLAIM=1    also provision the applicant auth user (not just the sponsor)
 *   ENV_FILE=.env.prod   point at hosted instead of .env.local
 *
 *   QA_SUFFIX=-qa2 tsx scripts/seed-sponsor-test.ts
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: process.env.ENV_FILE || ".env.local" })

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements, materializeSponsorPacket } from "../lib/requirements/materialize"
import { toGeneratorAnswers, type WizardAnswers } from "../lib/intake/answers"
import { resolveArmedTrack } from "../lib/requirements/track"
import { backfillCaseFacts } from "../lib/facts/resolve"
import { qaSuffix, qaSeedIdentities } from "../lib/qa/seed-identities"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
const db: SupabaseClient<Database> = createClient(URL, KEY, { auth: { persistSession: false } })

// QA_SUFFIX isolates a run's identities so parallel/repeat testers never collide and a
// run only ever touches its OWN rows. It goes in the email plus-part and the company
// name. A malformed suffix is REFUSED (never a silent fallback to the unsuffixed prod
// set — that bug created a stray unsuffixed case in production). Empty = the base set.
const SUFFIX = qaSuffix(process.env.QA_SUFFIX) // throws on a malformed suffix — never a silent fallback
/** Provision BOTH auth users (applicant + sponsor) instead of leaving the applicant to
 *  claim-by-signup. Useful for a scripted walk that signs in as the applicant directly. */
const PRECLAIM = process.env.QA_PRECLAIM === "1"

const { applicantEmail: APPLICANT_EMAIL, sponsorEmail: SPONSOR_EMAIL, safeguardEmail: SAFEGUARD_EMAIL, companyName: COMPANY_NAME } =
  qaSeedIdentities(SUFFIX)
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gunlicensenyc.com"

async function findUserByEmail(email: string): Promise<string | null> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())?.id ?? null
}

async function cleanup() {
  // Applicant: deleting the client cascades to the case → sponsorship.
  const { data: clients } = await db.from("clients").select("id").ilike("email", APPLICANT_EMAIL)
  for (const c of clients ?? []) await db.from("clients").delete().eq("id", c.id)
  // Any orphan sponsorships/sponsors from a half-run — scoped to THIS suffix's company.
  const { data: sponsors } = await db.from("sponsors").select("id").eq("legal_name", COMPANY_NAME)
  for (const s of sponsors ?? []) {
    await db.from("case_sponsorships").delete().eq("sponsor_id", s.id)
    await db.from("sponsors").delete().eq("id", s.id)
  }
  // Sponsor rep + (preclaimed) applicant auth users. Deleting the client above cascades
  // its rows, but the auth user lingers — remove both so a re-run is clean per suffix.
  for (const email of [SPONSOR_EMAIL, APPLICANT_EMAIL]) {
    const existing = await findUserByEmail(email)
    if (existing) await db.auth.admin.deleteUser(existing).catch(() => {})
  }
}

async function main() {
  console.log(`Seeding sponsor test on ${URL} …`)
  await cleanup()

  // 1. The company. Custodian NAME/contact are seeded, but the licence number is left
  //    NULL on purpose — so the tester sees the Carry Guard step-3 blocking state and can
  //    clear it by filling the number in the sponsor provisioning form.
  const { data: sponsor } = await db
    .from("sponsors")
    .insert({
      legal_name: COMPANY_NAME,
      custodian_name: "Dana Ruiz",
      custodian_email: "dana.ruiz@testguard.example",
      custodian_phone: "(212) 555-0170",
      // custodian_license_number: intentionally omitted (the blocking field).
    })
    .select("id")
    .single()

  // 2. The applicant — an UNCLAIMED lead + a case (claim-by-email adopts these).
  //    A real two-token legal name so the fact layer resolves first/last cleanly.
  const { data: client } = await db
    .from("clients")
    .insert({
      full_name: "Marcus Powell",
      email: APPLICANT_EMAIL,
      phone: "(212) 555-0148",
      borough: "Manhattan",
      zip: "10001",
      track: "resident",
      current_stage: "lead",
      lead_source: "sponsor_test",
      profile_id: null,
    })
    .select("id")
    .single()
  // A sponsored case is a concierge experience unlocked by the sponsorship itself,
  // not a Stripe purchase — so seed service_mode='concierge' deliberately (never an
  // accident of the seed).
  const { data: kase } = await db
    .from("cases")
    .insert({ client_id: client!.id, stage: "document_collection", service_mode: "concierge" })
    .select("id")
    .single()
  const caseId = kase!.id

  // 3. Pre-complete a FULL NYC Carry Guard applicant intake so every applicant-owned
  //    form fills and the completeness gate is satisfied. Business fields are left
  //    OUT on purpose — for a sponsored guard the employer IS the sponsoring company,
  //    supplied through the rep's company profile, not the applicant's intake.
  const answers: WizardAnswers = {
    dob: "1990-01-01",
    residence: "nyc",
    borough: "Manhattan",
    licenseType: "carry",
    middleInitial: "J",
    legalStreet: "123 Test St",
    legalApt: "4B",
    legalCity: "New York",
    legalState: "NY",
    placeOfBirth: "Brooklyn, NY, USA",
    sex: "Male",
    heightInches: 70,
    weightLbs: 180,
    hairColor: "Brown",
    eyeColor: "Brown",
    citizenship: "citizen",
    occupation: "Security officer",
    prohibitorFelony: false,
    prohibitorMentalHealth: false,
    prohibitorActiveOop: false,
    prohibitorUnlawfulDrug: false,

    // ── Carry Guard code-path exercisers (tasks 3, 4, 5, 9) ──
    // Two firearms: one licensed (renders the conditional licence-number field), one not.
    firearms: [
      { make: "Glock", model: "19", caliber: "9mm", serial: "AB12345", licensed: "Yes", licenseNumber: "NYC-778211" },
      { make: "Remington", model: "870", caliber: "12 ga", serial: "RM99001", licensed: "No" },
    ],
    // Two prior employers with full structured addresses; the second ENDS 2022-06 while
    // the first STARTS 2023-06 → a deliberate ~1-year gap, so the continuity guidance fires.
    employmentHistory: [
      { fromMonth: "2023-06", toMonth: "", employerName: "Acme Security LLC", employerAddress: "100 Market St", city: "Bronx", state: "NY", zip: "10451", occupation: "Security officer" },
      { fromMonth: "2019-01", toMonth: "2022-06", employerName: "Sentinel Guards Inc.", employerAddress: "5 River Rd", city: "Newark", state: "NJ", zip: "07102", occupation: "Guard" },
    ],
    // Two residences; the second is non-US so the "outside the United States" toggle renders.
    residenceHistory: [
      { fromMonth: "2022-01", toMonth: "", address: "123 Test St", apt: "4B", city: "New York", state: "NY", zip: "10001" },
      { fromMonth: "2018-03", toMonth: "2021-12", address: "88 King St W", city: "Toronto", country: "Canada" },
    ],
    // The designated safeguard person — drives the SGI-01 / SFG-01 third-party invite loop.
    safeguardName: "Jordan Reyes",
    safeguardRelation: "Sibling",
    safeguardPhone: "(212) 555-0199",
    safeguardMethod: "In a locked safe at my home; ammunition stored separately in the same safe.",
    safeguardAddress: "123 Test St, New York, NY 10001",
  }
  await db
    .from("intake_sessions")
    .upsert(
      { case_id: caseId, answers: answers as never, completed_at: new Date().toISOString() },
      { onConflict: "case_id" }
    )

  // 4. The sponsorship (full scope, NOT consented — the tester grants it).
  const token = randomBytes(24).toString("base64url")
  const { data: sponsorship } = await db
    .from("case_sponsorships")
    .insert({
      case_id: caseId,
      sponsor_id: sponsor!.id,
      invited_email: SPONSOR_EMAIL,
      invited_name: "Test Rep",
      invite_token: token,
      scope: "full",
      status: "invited",
    })
    .select("id")
    .single()

  // 5. Resolve the armed track + seed the applicant set and the company packet.
  const armed = resolveArmedTrack(answers)
  await db.from("cases").update({ license_track: armed.track }).eq("id", caseId)
  await materializeCaseRequirements(db, caseId, "nyc", toGeneratorAnswers(answers, { isRenewal: false, armed }))
  await materializeSponsorPacket(db, caseId)
  // Seed case_facts from the intake/client record, exactly as real intake processing
  // does — so the applicant's forms resolve from the canonical fact layer.
  await backfillCaseFacts(db, caseId)

  // 5b. Safeguard email is a directly-entered fact (no intake `from`), so set it as a
  //     shared case_fact, then stand up a PENDING safeguard invite so the tester can walk
  //     the third-party ID + acknowledgement upload loop at /g/<token>.
  await db.from("case_facts").upsert(
    { case_id: caseId, key: "safeguard.email", value: SAFEGUARD_EMAIL, source: "applicant", override_req_code: "" },
    { onConflict: "case_id,key,override_req_code" }
  )
  const safeguardToken = randomBytes(24).toString("base64url")
  await db.from("safeguard_invites").insert({
    case_id: caseId,
    email: SAFEGUARD_EMAIL,
    token: safeguardToken,
    token_expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    status: "invited",
    sent_at: new Date().toISOString(),
  })

  // 6. The sponsor rep account (pre-confirmed, role='sponsor').
  const tempPassword = randomBytes(9).toString("base64url")
  const { data: created, error } = await db.auth.admin.createUser({
    email: SPONSOR_EMAIL,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: "Test Rep" },
  })
  if (error || !created.user) throw new Error(`createUser: ${error?.message}`)
  const repId = created.user.id
  await db.from("profiles").update({ role: "sponsor", sponsor_id: sponsor!.id, full_name: "Test Rep" }).eq("id", repId)
  await db.from("case_sponsorships").update({ rep_profile_id: repId }).eq("id", sponsorship!.id)

  // 6b. QA_PRECLAIM — provision the applicant's auth user too and link it to the seeded
  //     client, so a scripted walk can sign in as the applicant without the signup step.
  let applicantPassword: string | null = null
  if (PRECLAIM) {
    applicantPassword = randomBytes(9).toString("base64url")
    const { data: ac, error: aerr } = await db.auth.admin.createUser({
      email: APPLICANT_EMAIL,
      password: applicantPassword,
      email_confirm: true,
      user_metadata: { full_name: "Marcus Powell" },
    })
    if (aerr || !ac.user) throw new Error(`createUser(applicant): ${aerr?.message}`)
    await db.from("clients").update({ profile_id: ac.user.id }).eq("id", client!.id)
    await db.from("profiles").update({ role: "client", full_name: "Marcus Powell" }).eq("id", ac.user.id)
  }

  console.log("\n✓ Test two-party case ready.\n")
  console.log(
    JSON.stringify(
      {
        applicant: {
          email: APPLICANT_EMAIL,
          action: PRECLAIM ? "SIGN IN (account provisioned)" : "SIGN UP on the site — case auto-claims by email",
          ...(applicantPassword ? { tempPassword: applicantPassword } : {}),
          track: armed.track,
        },
        suffix: SUFFIX || "(none)",
        sponsor: {
          email: SPONSOR_EMAIL,
          action: "SIGN IN (account already exists) or use the invite link",
          tempPassword,
          inviteUrl: `${SITE}/invite/${token}`,
        },
        safeguard: {
          email: SAFEGUARD_EMAIL,
          uploadUrl: `${SITE}/g/${safeguardToken}`,
          note: "Pending invite — the safeguard person uploads their own ID + signed acknowledgement here.",
        },
        sponsorCustodian: {
          name: "Dana Ruiz",
          licenceNumber: null,
          note: "Licence # left blank on purpose — fill it in the sponsor provisioning form to clear the Carry Guard step-3 block.",
        },
        caseId,
      },
      null,
      2
    )
  )
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
